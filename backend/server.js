import express from "express";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import cors from "cors";
import jwt from "jsonwebtoken";
import axios from "axios";
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from "mongoose";
import bodyParser from 'body-parser';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import crypto from 'crypto';
import session from 'express-session';
import {
    parseQueryWithOpenAI,
    generateComplementaryRecommendationsWithOpenAI,
    generateItemExplanations,
    
  } from "./utils/chatgptParser.js";

// Model Imports
import User from "./models/user.model.js";
import Cart from "./models/cart.model.js";
import Item from "./models/item.model.js";
import Order from "./models/order.model.js";
import Chat from "./models/chat.model.js";
import Category from "./models/category.model.js";
import FurnitureType from "./models/furnitureType.model.js";
import Log from "./models/log.model.js";

// Middleware & Config Imports
import { connectDB } from "./config/db.js";
import { authenticateToken, authorizeRoles } from "./middleware/auth.js";
import { calculateCustomPrice } from "./utils/priceCalculator.js";
import LoggerService from "./utils/logger.js"; // Activity logger service
import { captchaMiddleware } from "./utils/captcha.js"; // Captcha middleware



// =================================================================
// INITIALIZATION
// =================================================================
const app = express();
const server = createServer(app);

dotenv.config();
connectDB();
import { parseQueryWithGroq, generateComplementaryRecommendations } from './utils/groqParser.js';
import { pipeline } from '@xenova/transformers';

const io = new Server(server, {
            cors: {
            origin: [
                process.env.FRONTEND_URL || "http://localhost:5173",
                'http://172.20.10.4:5000',
                "http://172.20.10.4:8081", // Add React Native dev server
                "exp://172.20.10.4:8081",  // Add Expo dev server
                "http://localhost:8081"     // Add localhost for testing
            ],
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Configure Multer for in-memory file storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Configure Cloudinary using the credentials from .env
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// =================================================================
// MIDDLEWARE
// =================================================================
app.use(cors());
app.use(express.json());

// Session middleware setup
app.use(session({
    // TODO: Move this secret to a .env file in production
    secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
        httpOnly: true, // Prevents client-side JS from accessing the cookie
        maxAge: 1000 * 60 * 15 // 15 minutes
    }
}));

 // This replaces the need for bodyParser.json()
// --- START OF CHAT API ROUTES ---

// =================================================================
// CAPTCHA ROUTES
// =================================================================

const generateMathCaptcha = () => {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const question = `What is ${num1} + ${num2}?`;
    const answer = num1 + num2;
    return { question, answer };
};

app.get('/api/captcha', (req, res) => {
    const { question, answer } = generateMathCaptcha();
    req.session.captchaAnswer = answer;
    res.json({ success: true, question });
});

app.post('/api/captcha/verify', (req, res) => {
    const { userAnswer } = req.body;
    const correctAnswer = req.session.captchaAnswer;

    if (correctAnswer && userAnswer && parseInt(userAnswer, 10) === correctAnswer) {
        // Answer is correct, generate a one-time verification token
        const token = crypto.randomBytes(32).toString('hex');
        req.session.captchaToken = token; // Store token for final verification
        req.session.captchaVerified = true; // Mark as verified in session
        
        // Clear the answer so it can't be reused
        delete req.session.captchaAnswer;

        res.json({ success: true, message: 'Captcha verified', token });
    } else {
        // Answer is incorrect
        res.status(400).json({ success: false, message: 'Incorrect captcha answer. Please try again.' });
    }
});


//semantic search
// Load the model once when the server starts for efficiency


//review endpoint - start
// Add review to an item
app.post("/api/items/:id/reviews", authenticateToken, async (req, res) => {
    try {
      const { description, star } = req.body;
      const itemId = req.params.id;
      const userId = req.user.id;
  
      // Validate input
      if (!description || !star) {
        return res.status(400).json({
          success: false,
          message: "Description and star rating are required"
        });
      }
  
      if (star < 1 || star > 5) {
        return res.status(400).json({
          success: false,
          message: "Star rating must be between 1 and 5"
        });
      }
  
      // Check if item exists
      const item = await Item.findById(itemId);
      if (!item) {
        return res.status(404).json({
          success: false,
          message: "Item not found"
        });
      }
  
      // Check if user has already reviewed this item
      const existingReview = item.reviews.find(review => 
        review.userId && review.userId.toString() === userId
      );
  
      if (existingReview) {
        return res.status(400).json({
          success: false,
          message: "You have already reviewed this item"
        });
      }
  
      // Add the review with user information
      const newReview = {
        description,
        star,
        userId: userId,
        userName: req.user.name,
        createdAt: new Date()
      };
  
      item.reviews.push(newReview);
      await item.save();
  
      // Log the review action
      await Log.create({
        action: 'review_added',
        entityType: 'item',
        entityId: itemId,
        userId: userId,
        userName: req.user.name,
        userRole: req.user.role,
        details: {
          itemName: item.name,
          rating: star,
          reviewLength: description.length
        }
      });
  
      res.json({
        success: true,
        message: "Review added successfully",
        review: newReview
      });
  
    } catch (error) {
      console.error("Error adding review:", error);
      res.status(500).json({
        success: false,
        message: "Server error while adding review"
      });
    }
  });
  
  // Get reviews for an item
  app.get("/api/items/:id/reviews", async (req, res) => {
    try {
      const itemId = req.params.id;
  
      const item = await Item.findById(itemId).select('reviews');
      if (!item) {
        return res.status(404).json({
          success: false,
          message: "Item not found"
        });
      }
  
      res.json({
        success: true,
        reviews: item.reviews || []
      });
  
    } catch (error) {
      console.error("Error fetching reviews:", error);
      res.status(500).json({
        success: false,
        message: "Server error while fetching reviews"
      });
    }
  });
  
  // Update review (only by the user who created it)
  app.put("/api/items/:id/reviews/:reviewId", authenticateToken, async (req, res) => {
    try {
      const { description, star } = req.body;
      const itemId = req.params.id;
      const reviewId = req.params.reviewId;
      const userId = req.user.id;
  
      // Validate input
      if (!description || !star) {
        return res.status(400).json({
          success: false,
          message: "Description and star rating are required"
        });
      }
  
      if (star < 1 || star > 5) {
        return res.status(400).json({
          success: false,
          message: "Star rating must be between 1 and 5"
        });
      }
  
      const item = await Item.findById(itemId);
      if (!item) {
        return res.status(404).json({
          success: false,
          message: "Item not found"
        });
      }
  
      // Safely locate the review (skip undefined entries)
      const reviewIndex = item.reviews.findIndex((review) => {
        if (!review || !review._id) return false;
        return review._id.toString() === reviewId;
      });
  
      if (reviewIndex === -1) {
        return res.status(404).json({
          success: false,
          message: "Review not found"
        });
      }
  
      const review = item.reviews[reviewIndex] || {};
  
      // Check if user owns this review
      if (review.userId && review.userId.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: "You can only edit your own reviews"
        });
      }
  
      // Update the review
      item.reviews[reviewIndex] = {
        ...review.toObject(),
        description,
        star,
        updatedAt: new Date()
      };
  
      await item.save();
  
      res.json({
        success: true,
        message: "Review updated successfully",
        review: item.reviews[reviewIndex]
      });
  
    } catch (error) {
      console.error("Error updating review:", error);
      res.status(500).json({
        success: false,
        message: "Server error while updating review"
      });
    }
  });
  
  // Delete review (only by the user who created it or admin)
  app.delete("/api/items/:id/reviews/:reviewId", authenticateToken, async (req, res) => {
    try {
      const itemId = req.params.id;
      const reviewId = req.params.reviewId;
      const userId = req.user.id;
      const userRole = req.user.role;
  
      const item = await Item.findById(itemId);
      if (!item) {
        return res.status(404).json({
          success: false,
          message: "Item not found"
        });
      }
  
      // Find the review (with debug logging)
      console.log('[DELETE REVIEW] Incoming itemId:', itemId, ' reviewId:', reviewId);
      const reviewIndex = item.reviews.findIndex((review) => {
        if (!review || !review._id) return false;
        return review._id.toString() === reviewId;
      });
      console.log('[DELETE REVIEW] Review IDs in item:', item.reviews.map(r=>r?._id?.toString()));
  
      if (reviewIndex === -1) {
        return res.status(404).json({
          success: false,
          message: "Review not found"
        });
      }
  
      const review = item.reviews[reviewIndex] || {};
  
      // Check if user owns this review or is admin
      if (review.userId && review.userId.toString() !== userId && userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          message: "You can only delete your own reviews"
        });
      }
  
      // Remove the review
      item.reviews.splice(reviewIndex, 1);
      await item.save();
  
      res.json({
        success: true,
        message: "Review deleted successfully"
      });
  
    } catch (error) {
      console.error("Error deleting review:", error);
      res.status(500).json({
        success: false,
        message: "Server error while deleting review"
      });
    }
  });

//review endpoint - end




let extractor;
(async () => {
  try {
    console.log("Loading semantic search model (Xenova/bge-small-en-v1.5)...");
    extractor = await pipeline(
      "feature-extraction",
      "Xenova/bge-small-en-v1.5"
    );
    console.log("Semantic search model loaded successfully.");
  } catch (err) {
    console.error("Failed to load semantic search model:", err);
  }
})();



// The refactored semantic search endpoint
app.post("/api/items/semantic-search", async (req, res) => {
    try {
      const { query } = req.body;
  
      if (!query)
        return res
          .status(400)
          .json({ success: false, message: "Query is required." });
  
      const command = await parseQueryWithOpenAI(query);
  
      console.log("[AI Parsed Command]:", command);
  
      const { semanticQuery, limit, sortBy, sortOrder, filters } = command;
  
      if (!extractor) {
        return res
          .status(503)
          .json({
            success: false,
            message:
              "AI search model is still loading. Please try again in a moment.",
          });
      }
  
      // AI controls the limit - use AI's suggested limit or smart defaults
      const numResults = parseInt(limit, 10) || getSmartLimit(command);
  
      // Build a $match stage for any non-vector filters we want to apply *after* similarity scoring
  
      const postMatchStage = {};
  
      if (filters) {
        if (filters.maxPrice)
          postMatchStage.price = {
            ...postMatchStage.price,
            $lte: filters.maxPrice,
          };
  
        if (filters.minPrice)
          postMatchStage.price = {
            ...postMatchStage.price,
            $gte: filters.minPrice,
          };
  
        if (filters.maxLength)
          postMatchStage.length = { $lte: filters.maxLength };
  
        if (filters.maxWidth) postMatchStage.width = { $lte: filters.maxWidth };
  
        if (filters.maxHeight)
          postMatchStage.height = { $lte: filters.maxHeight };
  
        if (filters.is_bestseller !== undefined)
          postMatchStage.is_bestseller = filters.is_bestseller;
  
        if (filters.is_customizable !== undefined)
          postMatchStage.is_customizable = filters.is_customizable;
  
        if (filters.isPackage !== undefined)
          postMatchStage.isPackage = filters.isPackage;
      }
  
      const pipeline = [];
  
      const queryEmbedding = await extractor(semanticQuery, {
        pooling: "mean",
        normalize: true,
      });
  
      // $vectorSearch MUST be the first stage in the pipeline
  
      pipeline.push({
        $vectorSearch: {
          index: "vector_index",
  
          path: "embedding",
  
          queryVector: Array.from(queryEmbedding.data),
  
          numCandidates: 200,
  
          limit: numResults,
        },
      });
  
      // Apply attribute-based filters *after* the similarity search
  
      if (Object.keys(postMatchStage).length > 0) {
        pipeline.push({ $match: postMatchStage });
      }
  
      if (sortBy && sortOrder) {
        const sortStage = { $sort: { [sortBy]: sortOrder === "asc" ? 1 : -1 } };
  
        pipeline.push(sortStage);
      }
  
      pipeline.push({
        $project: {
          _id: 1,
          name: 1,
          description: 1,
          price: 1,
          imageUrl: 1,
          sales: 1,
          reviews: 1,
          category: 1,
          furnituretype: 1,
          rating: 1,
          score: { $meta: "vectorSearchScore" },
        },
      });
  
      const results = await Item.aggregate(pipeline);
  
      // Generate AI explanations for each recommended item
      const resultsWithExplanations = await generateItemExplanations(results, query, command);
  
      res.json({ success: true, ItemData: resultsWithExplanations, parsedCommand: command, semanticQuery });
    } catch (err) {
      console.error("Error in semantic search route:", err);
  
      res
        .status(500)
        .json({ success: false, message: "Server error during search." });
    }
  });

// Get all chats for the logged-in admin
app.get('/api/chats', authenticateToken, authorizeRoles("admin"), async (req, res) => {
    try {
        const chats = await Chat.find({})
            .populate('participants', 'name email role')
            // THIS IS THE CRITICAL FIX: Deeply populate the sender within the messages array
            .populate({
                path: 'messages.sender',
                select: 'name role' // Select the fields you need
            })
            .sort({ lastMessageAt: -1 });
        res.json(chats);
    } catch (err) {
        console.error("Error fetching chats for admin:", err.message);
        res.status(500).send('Server Error');
    }
});

// Get or create a chat for a user with an admin

app.post('/api/chats', authenticateToken, async (req, res) => {
    if (req.user.role !== 'user') {
        return res.status(403).json({ msg: 'Only users can start chats.' });
    }
    try {
        const admin = await User.findOne({ role: 'admin' });
        if (!admin) {
            return res.status(404).json({ msg: 'No admin available to chat with.' });
        }

        let chat = await Chat.findOne({
            participants: { $all: [req.user.id, admin.id] }
        });

        if (!chat) {
            chat = new Chat({
                participants: [req.user.id, admin.id],
                messages: []
            });
            await chat.save();
        }

        // THIS IS THE CRITICAL FIX: Ensure population happens reliably after finding or creating
        await chat.populate([
            { path: 'participants', select: 'name role' },
            { path: 'messages.sender', select: 'name role' }
        ]);

        res.json(chat);
    } catch (err) {
        console.error("Error fetching/creating chat for user:", err.message);
        res.status(500).send('Server Error');
    }
});

// Add a new message to a chat
app.post('/api/chats/:chatId/messages', authenticateToken, async (req, res) => {
    const { message } = req.body;
    const { chatId } = req.params;
    const userId = req.user.id;

    if (!message) {
        return res.status(400).json({ msg: 'Message content is required.' });
    }

    try {
        const chat = await Chat.findById(chatId);

        if (!chat) {
            return res.status(404).json({ msg: 'Chat not found.' });
        }

        // Ensure the user is a participant of the chat
        if (!chat.participants.map(p => p.toString()).includes(userId)) {
            return res.status(403).json({ msg: 'You are not authorized to send messages in this chat.' });
        }

        const newMessage = {
            sender: userId,
            content: message, // Correctly use 'content' field to match the Chat model
            timestamp: new Date()
        };

        chat.messages.push(newMessage);
        chat.lastMessageAt = new Date();

        await chat.save();

        // Populate sender info for the new message to return to client
        const populatedChat = await chat.populate({
            path: 'messages.sender',
            select: 'name role'
        });

        const returnedMessage = populatedChat.messages[populatedChat.messages.length - 1];

        res.status(201).json({ success: true, message: returnedMessage });

    } catch (err) {
        console.error("Error sending message:", err.message);
        res.status(500).send('Server Error');
    }
});

// --- START OF CHAT API ROUTES ---

// --- WEBSOCKET (SOCKET.IO) LOGIC ---
io.on('connection', (socket) => {
    console.log('A user connected via WebSocket:', socket.id);

    socket.on('joinChat', (chatId) => {
        socket.join(chatId);
        console.log(`User ${socket.id} joined chat room ${chatId}`);
    });

    socket.on('leaveChat', (chatId) => {
        socket.leave(chatId);
        console.log(`User ${socket.id} left chat room ${chatId}`);
    });

    socket.on('sendMessage', async ({ chatId, senderId, content }) => {
        try {
            console.log('Received sendMessage:', { chatId, senderId, content });

            const sender = await User.findById(senderId);
            if (!sender) {
                console.error('Sender not found:', senderId);
                socket.emit('messageError', {
                    chatId,
                    error: 'Sender not found'
                });
                return;
            }

            const message = {
                sender: senderId,
                content: content,
                timestamp: new Date()
            };

            const chat = await Chat.findByIdAndUpdate(
                chatId,
                {
                    $push: { messages: message },
                    lastMessageAt: new Date()
                },
                { new: true }
            ).populate('messages.sender', 'name role');

            if (chat) {
                const lastMessage = chat.messages[chat.messages.length - 1];
                const messageToSend = {
                    _id: lastMessage._id,
                    content: lastMessage.content,
                    timestamp: lastMessage.timestamp,
                    chatId: chat._id.toString(),
                    sender: {
                        _id: sender._id.toString(),
                        name: sender.name,
                        role: sender.role
                    }
                };

                console.log('Broadcasting message to room:', chatId);
                // Broadcast to all users in the chat room
                io.in(chatId).emit('receiveMessage', messageToSend);

                // Notify all connected clients about chat list update
                io.emit('updateChatList');

                // Send acknowledgment back to sender
                socket.emit('messageSent', {
                    success: true,
                    message: messageToSend
                });
            } else {
                console.error('Chat not found:', chatId);
                socket.emit('messageError', {
                    chatId,
                    error: 'Chat not found'
                });
            }
        } catch (error) {
            console.error('Error handling sendMessage:', error);
            socket.emit('messageError', {
                chatId,
                error: 'Failed to send message'
            });
        }
    });

    socket.on('typing', ({ chatId, isTyping }) => {
        socket.to(chatId).emit('userTyping', {
            chatId,
            userId: socket.id,
            isTyping
        });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected from WebSocket:', socket.id);
    });
});
// --- END OF WEBSOCKET LOGIC ---




// =====================================================================
// LOGS ENDPOINT
// =====================================================================

app.get('/api/logs', authenticateToken, authorizeRoles("admin"), async (req, res) => {
    try {
        const { startDate, endDate, action, entityType, userId, limit, skip } = req.query;

        const filters = { startDate, endDate, action, entityType, userId };
        const options = {
            limit: limit ? parseInt(limit, 10) : 100,
            skip: skip ? parseInt(skip, 10) : 0,
        };

        const { logs, total } = await LoggerService.getLogs(filters, options);
        res.json({ success: true, logs, total });
    } catch (err) {
        console.error('Error fetching logs:', err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

//PATMONGO API------------------------------------------------------------


// In backend/server.js

// ... other code

app.post("/api/create-checkout-session", authenticateToken, async (req, res) => {
    const { paymentAmount, items, orderId, shippingFee } = req.body;
    try {
        console.log("💰 Creating checkout session:", {
            paymentAmount,
            orderId,
            itemsCount: items.length
        });

        // Create a single line item with the calculated payment amount (excluding shipping)
        const line_items = [{
            amount: Math.round(paymentAmount * 100) - (shippingFee ? shippingFee * 100 : 0), // Convert to cents for PayMongo
            currency: "PHP",
            name: "Order Payment",
            quantity: 1
        }];

        // Add shipping fee as a separate line item if present
        if (shippingFee && shippingFee > 0) {
            line_items.push({
                amount: shippingFee * 100,
                currency: "PHP",
                name: "Shipping Fee",
                quantity: 1,
            });
        }

        const response = await axios.post(
            "https://api.paymongo.com/v1/checkout_sessions",
            {
                data: {
                    attributes: {
                        line_items,
                        payment_method_types: ["gcash", "card"],
                        send_email_receipt: true,
                        show_line_items: true,
                        metadata: {
                            orderId: orderId,
                            paymentContext: 'new_order'
                        }
                    },
                },
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Basic ${Buffer.from(
                        `${process.env.PAYMONGO_SECRET_KEY}:`
                    ).toString("base64")}`,
                },
            }
        );

        const checkoutId = response.data.data.id;
        // IMPROVEMENT: Use 'pending' for paymentStatus for clarity
        await Order.findByIdAndUpdate(orderId, {
            transactionId: checkoutId,
            // Correct initial status
        });

        res.json({
            checkoutUrl: response.data.data.attributes.checkout_url,
        });

    } catch (error) {
        console.error("Paymongo error:", error.response?.data || error.message);
        res.status(500).json({
            error: "Payment failed",
            details: error.response?.data?.errors || error.message,
        });
    }
});




// Add endpoint to handle canceled payments
app.put("/api/orders/:id/cancel", authenticateToken, async (req, res) => {
    try {
        const order = await Order.findByIdAndUpdate(
            req.params.id,
            {
                status: 'Cancelled',
                paymentStatus: 'failed' // Mark payment as failed when cancelled
            },
            { new: true }
        );

        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        // Verify the order belongs to the requesting user
        if (order.user.toString() !== req.user.id) {
            return res.status(403).json({ error: "Unauthorized" });
        }

        res.json(order);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * ✅ REVISED AND SIMPLIFIED: Get Order Status Endpoint
 * This endpoint now correctly serves as a simple data fetcher.
 * It relies on the webhook to have updated the order information.
 */
app.get("/api/order/:id/status", authenticateToken, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('user', 'name email')
            .populate('items.item');

        if (!order) {
            return res.status(404).json({ success: false, error: "Order not found" });
        }

        // Verify the order belongs to the requesting user or an admin
        if (order.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, error: "Unauthorized" });
        }

        // Directly return the order data from the database.
        // The SuccessPage will get the most current data as updated by the webhook.
        res.json({
            success: true,
            ...order.toObject(),
            // Ensure address and phone are explicitly included if they are top-level fields in the model
            address: order.address,
            phone: order.phone
        });

    } catch (error) {
        console.error("Error fetching order status:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get all orders for a user
app.get("/api/user/orders", authenticateToken, async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user.id })
            .sort('-createdAt')
            .populate('user', 'name email phone address') // Include address in population
            .populate('items.item');

        // Enhanced debugging
        console.log('=== USER ORDERS DEBUG ===');
        console.log('User ID:', req.user.id);
        console.log('Total orders found:', orders.length);

        orders.forEach((order, index) => {
            console.log(`Order ${index + 1}:`, {
                id: order._id,
                status: order.status,
                hasDeliveryProof: !!order.deliveryProof,
                deliveryProofValue: order.deliveryProof,
                hasDeliveryDate: !!order.deliveryDate,
                deliveryDateValue: order.deliveryDate,
                hasUserAddress: !!order.user?.address,
                allFields: Object.keys(order.toObject())
            });
        });

        res.json(orders);
    } catch (error) {
        console.error('Error fetching user orders:', error);
        res.status(500).json({ error: error.message });
    }
});


// Save order only
app.post('/api/orders', authenticateToken, async (req, res) => {
    try {
        const {
            orderStatus,
            items,
            amount,
            shippingAddress,
            totalWithShipping,
            shippingFee,
            paymentType,
            amountPaid,
            balance,           // <-- add this
            deliveryOption
        } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, message: 'Items are required' });
        }

        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Valid total amount is required' });
        }

        if (!shippingAddress || !shippingAddress.address || !shippingAddress.phone) {
            return res.status(400).json({ success: false, message: 'Complete shipping address with phone is required' });
        }

        // Create new order with correct field names matching the Order model
        const newOrder = new Order({
            user: req.user.id,
            items: items.map(item => ({
                item: item.product, // Map 'product' to 'item' to match schema
                quantity: item.quantity,
                price: item.price,
                customH: item.customH ?? null,
                customW: item.customW ?? null,
                customL: item.customL ?? null,
                legsFrameMaterial: item.legsFrameMaterial ?? null,
                tabletopMaterial: item.tabletopMaterial ?? null
            })),
            amount: amount,
            shippingFee: shippingFee,
            paymentType: paymentType,
            paymentStatus: paymentType === 'down_payment' ? 'Downpayment Received' : 'Fully Paid',
            totalWithShipping: totalWithShipping,
            deliveryOption: deliveryOption,
            amountPaid: amountPaid,
            balance: balance,
            address: `${shippingAddress.address}, ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.zipCode}`,
            phone: shippingAddress.phone || '000-000-0000',
            shippingAddress: {
                fullName: shippingAddress.fullName || req.user.name || '',
                addressLine1: shippingAddress.address,
                city: shippingAddress.city,
                state: shippingAddress.state,
                postalCode: shippingAddress.zipCode,
                phone: shippingAddress.phone,
            },
            status: orderStatus, // Default status
        });

        await newOrder.save();

        // Populate the order with item details
        const populatedOrder = await Order.findById(newOrder._id)
            .populate('user', 'name email')
            .populate('items.item', 'name price');

        // Log order creation (user side)
        await LoggerService.logOrder('order_created', populatedOrder, req.user, {
            itemsCount: populatedOrder.items.length,
            paymentStatus: populatedOrder.paymentStatus,
        }, req);

        res.status(201).json({
            success: true,
            message: 'Order created successfully',
            OrderData: populatedOrder
        });

    } catch (err) {
        console.error('Error creating order:', err.message);
        res.status(500).json({ success: false, message: 'Server error creating order' });
    }
});



//confirms order after paymongo
app.put('/api/orders/:id/confirm', async (req, res) => {
    const order = await Order.findById(req.params.id);
    if (!order) {
        return res.status(404).json({ error: "Order not found" });
    }
    order.status = 'On Process';
    await order.save();
    res.json(order);
});
//PAYMONGO API END ------------------------------------------------------




//USERS API----------------------------------------------------------------

// registration
app.post("/api/registeruser", captchaMiddleware(), async (req, res) => {
        console.log("=== REGISTRATION REQUEST RECEIVED ===");
        console.log("Request body:", req.body);

        const { name, email, password, phone, address, role } = req.body;

        // Enhanced validation with specific error messages
        const validationErrors = [];

        if (!name || name.trim().length < 2) {
            validationErrors.push("Name must be at least 2 characters long");
        }

        if (!email || !email.trim()) {
            validationErrors.push("Email is required");
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            validationErrors.push("Please provide a valid email address");
        }

        if (!password) {
            validationErrors.push("Password is required");
        } else if (password.length < 6) {
            validationErrors.push("Password must be at least 6 characters long");
        } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
            validationErrors.push(
                "Password must contain at least one uppercase letter, one lowercase letter, and one number"
            );
        }

        if (!phone || phone.trim().length < 10) {
            validationErrors.push("Please provide a valid phone number");
        }

        // Return validation errors if any
        if (validationErrors.length > 0) {
            console.log("❌ Validation failed:", validationErrors);
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: validationErrors,
            });
        }

        try {
            // Check for existing user (case insensitive)
            console.log("🔍 Checking for existing user with email:", email);
            const existingUser = await User.findOne({
                email: { $regex: new RegExp(`^${email.trim()}$`, "i") },
            });

            if (existingUser) {
                console.log("❌ User already exists with email:", email);
                return res.status(409).json({
                    success: false,
                    message:
                        "An account with this email already exists. Please use a different email or try logging in.",
                });
            }

            console.log("✅ Email is available");
            console.log("🔐 Hashing password...");

            // Hash password with proper salt rounds
            const saltRounds = 12; // Increased for better security
            const hashedPassword = await bcrypt.hash(password, saltRounds);

            console.log("✅ Password hashed successfully");

            // Prepare user data
            const userData = {
                name: name.trim(),
                email: email.trim().toLowerCase(), // Normalize email
                phone: phone.trim(),
                password: hashedPassword,
                role: role || "user",
                address: address || {} // Make address optional
            };

            console.log("💾 Creating new user...");
            const newUser = new User(userData);
            const savedUser = await newUser.save();

            console.log("✅ User created successfully:", {
                id: savedUser._id,
                email: savedUser.email,
                role: savedUser.role,
            });

            // Create cart for the user
            console.log("🛒 Creating cart for user...");
            const newCart = new Cart({
                user: savedUser._id,
                items: [],
            });
            const savedCart = await newCart.save();

            // Link cart to user
            savedUser.cart = savedCart._id;
            await savedUser.save();

            console.log("✅ Cart created and linked to user");
            console.log("=== REGISTRATION SUCCESSFUL ===");

            // Log user registration with captcha data
            await LoggerService.logUser('user_registered', savedUser, savedUser, {
                captchaSuccess: req.captchaData?.success,
                captchaType: req.captchaData?.type
            }, req);

            // Return success response (don't include password)
            const userResponse = {
                id: savedUser._id,
                name: savedUser.name,
                email: savedUser.email,
                phone: savedUser.phone,
                role: savedUser.role,
                cart: savedCart._id,
            };

            res.status(201).json({
                success: true,
                message: "Account created successfully! You can now log in.",
                UserData: {
                    user: userResponse,
                    cart: savedCart,
                },
            });
        } catch (error) {
            console.log("=== REGISTRATION ERROR ===");
            console.error("Registration error:", error);

            // Handle specific MongoDB errors
            if (error.code === 11000) {
                // Duplicate key error
                const field = Object.keys(error.keyPattern)[0];
                const message =
                    field === "email"
                        ? "An account with this email already exists"
                        : `This ${field} is already in use`;

                return res.status(409).json({
                    success: false,
                    message,
                });
            }

            if (error.name === "ValidationError") {
                // Mongoose validation error
                const validationErrors = Object.values(error.errors).map(
                    (e) => e.message
                );
                return res.status(400).json({
                    success: false,
                    message: "Validation failed",
                    errors: validationErrors,
                });
            }

            // Generic server error
            res.status(500).json({
                success: false,
                message: "Server error during registration. Please try again.",
                error: process.env.NODE_ENV === "development" ? error.message : undefined,
            });
        }
    }
);

// In server.js — REPLACE your old user address update endpoint with this:

// Update logged-in user's address
app.put('/api/user/address', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found.' });

        const info = req.body;

        // ✅ CORRECTED LOGIC: Properly maps fields from the request body
        user.address = {
            fullName: info.fullName,
            addressLine1: info.addressLine1,
            addressLine2: info.addressLine2,
            provinceCode: info.provinceCode, // Use provinceCode
            provinceName: info.provinceName,
            cityCode: info.cityCode,         // Use cityCode
            cityName: info.cityName,
            brgyCode: info.brgyCode,         // Use brgyCode
            brgyName: info.brgyName,
            postalCode: info.postalCode
        };
        // Also update the main phone number on the user object
        if (info.phone) {
            user.phone = info.phone;
        }

        await user.save();
        res.json({ success: true, message: 'Address updated', address: user.address });
    } catch (err) {
        console.error('Error updating address:', err.message);
        res.status(500).json({ error: 'Server error while updating address.' });
    }
});
// read all users
app.get('/api/allusers', authenticateToken, authorizeRoles('admin'), async (req, res) => {
    try {
        const users = await User.find({}).populate({
            path: 'cart',
            populate: {
                path: 'items.item',
                model: 'Item'
            }
        });
        res.json({ success: true, UserData: users });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error fetching users', error: err.message });
    }
});
// login ng user with encryption
app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
        return res.status(400).json({ success: false, message: "Please fill in all fields" });
    }

    try {
        // Find user by email
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({ success: false, message: "Invalid email or password" });
        }
        console.log("Found user:", user);

        // Compare passwords
        const isMatch = await bcrypt.compare(password, user.password);

        console.log("Attempting to compare:", {
            providedPassword: password,
            hashedPasswordFromDB: user.password
        });

        console.log("Password match result:", isMatch);

        // Log successful login
        if (isMatch) {
            await LoggerService.logUser('user_login', user, user, {}, req);
        }

        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid email or password" });
        }

        // Issue JWT
        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );
        res.status(200).json({ success: true, message: "Login successful", token, userId: user._id, role: user.role });
    } catch (error) {
        console.error("Login error:", error.message);
        res.status(500).json({ success: false, message: "Server error during login" });
    }
});
// read one user
app.get('/api/singleusers/:id', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.params.id).populate({
            path: 'cart',
            populate: { path: 'items.item' }
        });

        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        res.json({ success: true, UserData: user });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error fetching user', error: err.message });
    }
});
// update user
app.put('/api/users/:id', authenticateToken, authorizeRoles("admin"), async (req, res) => {
    try {
        const { name, email, phone, role } = req.body;
        const updated = await User.findByIdAndUpdate(
            req.params.id,
            { name, email, phone, role },
            { new: true }
        ).select('-password');
        if (!updated) return res.status(404).json({ success: false, message: 'User not found' });
        res.json({ success: true, UserData: updated });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error updating user', error: err.message });
    }
});
// "Delete" user (soft delete)
// AFTER (in server.js)
// ✅ REVISED: Deactivate user (soft delete) using PUT
app.put('/api/users/:id/deactivate', authenticateToken, authorizeRoles("admin"), async (req, res) => {
    try {
        console.log(`- Deactivating User ${req.params.id}`);
        const updated = await User.findByIdAndUpdate(
            req.params.id,
            { status: 0 }, // Set status to inactive
            { new: true }
        );
        if (!updated) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({ success: true, message: 'User account deactivated successfully' });
    } catch (err) {
        console.error(`Error deactivating user ${req.params.id}:`, err);
        res.status(500).json({ success: false, message: 'Server error while deactivating user' });
    }
});
// Reactivate user
app.put('/api/users/:id/activate', authenticateToken, authorizeRoles("admin"), async (req, res) => {
    try {
        console.log(`🔄  [Activate] Re-enabling User ${req.params.id}`);
        const updated = await User.findByIdAndUpdate(
            req.params.id,
            { status: 1 },
            { new: true }
        ).select('-password');
        if (!updated) return res.status(404).json({ success: false, message: 'User not found' });
        res.json({ success: true, message: 'User account activated', UserData: updated });
    } catch (err) {
        console.error('Error activating user:', err.message);
        res.status(500).json({ success: false, message: 'Server error activating user' });
    }
});


//ITEMS API----------------------------------------------------------------




// create item
app.post(
    "/api/items",
    authenticateToken,
    authorizeRoles("admin"),
    upload.array("images", 2),
    async (req, res) => {
      // The middleware upload.array('images', 2) expects up to 2 files in a field named 'images'
      try {
        if (!req.files || req.files.length === 0) {
          return res
            .status(400)
            .json({ success: false, message: "At least one image is required." });
        }
  
        // Upload each file to Cloudinary and collect the URLs
        const uploadPromises = req.files.map(
          (file) =>
            new Promise((resolve, reject) => {
              const uploadStream = cloudinary.uploader.upload_stream(
                { folder: "products" },
                (error, result) => {
                  if (error) return reject(error);
                  resolve(result.secure_url);
                }
              );
              uploadStream.end(file.buffer);
            })
        );
  
        const imageUrls = await Promise.all(uploadPromises);
  
        let bodyData = { ...req.body };
        // Parse boolean is_customizable
        if (typeof bodyData.is_customizable !== "undefined") {
          bodyData.is_customizable =
            bodyData.is_customizable === "true" ||
            bodyData.is_customizable === true;
        }
  
        if (bodyData.customization_options) {
          if (typeof bodyData.customization_options === "string") {
            try {
              bodyData.customization_options = JSON.parse(
                bodyData.customization_options
              );
            } catch (e) { }
          }
        }
  
        // Ensure numeric conversions and default cost if missing
        if (bodyData.price) bodyData.price = Number(bodyData.price);
        if (bodyData.stock) bodyData.stock = Number(bodyData.stock);
        if (bodyData.length) bodyData.length = Number(bodyData.length);
        if (bodyData.height) bodyData.height = Number(bodyData.height);
        if (bodyData.width) bodyData.width = Number(bodyData.width);
  
        if (
          typeof bodyData.cost === "undefined" &&
          typeof bodyData.price !== "undefined"
        ) {
          bodyData.cost = bodyData.price; // default cost same as base price if not supplied
        }
  
        // Create new item with array of image URLs
        const newItem = new Item({ ...bodyData, imageUrl: imageUrls });
        await newItem.save();
  
        // Log the item creation
        await LoggerService.logItem(
          "item_created",
          newItem,
          req.user,
          {
            itemName: newItem.name,
            price: newItem.price,
            stock: newItem.stock,
            isCustomizable: newItem.is_customizable,
          },
          req
        );
  
        res.status(201).json({ success: true, ItemData: newItem });
      } catch (err) {
        console.error("Error creating item:", err);
        res
          .status(500)
          .json({ success: false, message: "Server error creating item." });
      }
    }
  );
  // read item all (active by default, or filter by status)
  app.get("/api/items", async (req, res) => {
    try {
      const includeInactive = req.query.includeInactive === "true";
      const showOnlyInactive = req.query.showOnlyInactive === "true";
  
      let filter = {};
      if (showOnlyInactive) {
        filter = { status: 0 };
      } else if (!includeInactive) {
        filter = { status: 1 };
      }
  
      console.log(
        `[GET /api/items] includeInactive=${includeInactive}, showOnlyInactive=${showOnlyInactive} -> filter`,
        filter
      );
  
      const items = await Item.find(filter)
        .populate("category", "name status")
        .populate("furnituretype", "name status");
      res.json({ success: true, ItemData: items });
    } catch (err) {
      console.error("Error fetching items:", err.message);
      res
        .status(500)
        .json({ success: false, message: "Server error fetching items" });
    }
  });
  // read specific item
  app.get("/api/items/:id", async (req, res) => {
    try {
      const item = await Item.findById(req.params.id)
        .populate("category", "name")
        .populate("furnituretype", "name");
      if (!item) {
        return res
          .status(404)
          .json({ success: false, message: "Item not found" });
      }
      res.json({ success: true, Itemdata: item });
    } catch (err) {
      console.error("Error fetching item:", err.message);
      res
        .status(500)
        .json({ success: false, message: "Server error fetching item" });
    }
  });
  // update a item
  app.put(
    "/api/items/:id",
    authenticateToken,
    authorizeRoles("admin"),
    upload.array("images", 5),
    async (req, res) => {
      try {
        let updates = {
          name: req.body.name,
          description: req.body.description,
          price: req.body.price,
          category: req.body.category,
          furnituretype: req.body.furnituretype,
          length: req.body.length,
          height: req.body.height,
          width: req.body.width,
          stock: req.body.stock,
          is_bestseller: req.body.is_bestseller,
          isPackage: req.body.isPackage,
        };
  
        // Handle customization fields
        if (typeof req.body.is_customizable !== "undefined") {
          updates.is_customizable =
            req.body.is_customizable === "true" ||
            req.body.is_customizable === true;
        }
  
        if (req.body.customization_options) {
          let customOpts = req.body.customization_options;
          // If came as string from multipart, parse JSON
          if (typeof customOpts === "string") {
            try {
              customOpts = JSON.parse(customOpts);
            } catch (e) {
              /* ignore parse error */
            }
          }
          updates.customization_options = customOpts;
        }
  
        // If new images were uploaded, process them
        if (req.files && req.files.length > 0) {
          // Upload each file to Cloudinary and collect the URLs
          const uploadPromises = req.files.map(
            (file) =>
              new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                  { folder: "products" },
                  (error, result) => {
                    if (error) return reject(error);
                    resolve(result.secure_url);
                  }
                );
                uploadStream.end(file.buffer);
              })
          );
  
          const imageUrls = await Promise.all(uploadPromises);
          updates.imageUrl = imageUrls;
        }
        // If no new images uploaded, keep existing imageUrl (don't update it)

        const updated = await Item.findByIdAndUpdate(req.params.id, updates, {
          new: true,
        });
        if (!updated) {
          return res
            .status(404)
            .json({ success: false, message: "Item not found" });
        }

        // --- NEW LOGIC: Re-generate embedding on update ---
        try {
          // We need to re-fetch to get populated fields for the text generation
          const itemForEmbedding = await Item.findById(updated._id)
            .populate('category', 'name')
            .populate('furnituretype', 'name');

          const textToEmbed = generateSearchableText(itemForEmbedding);

          if (!extractor) {
            console.warn(`Embedding model not ready, skipping embedding update for item ${updated._id}`);
          } else if (textToEmbed && textToEmbed.length > 0) {
            console.log(`[Embed Update] Regenerating embedding for '${updated.name}'...`);
            const output = await extractor(textToEmbed, { pooling: "mean", normalize: true });
            const embedding = Array.from(output.data);
            // Update the item with the new embedding without another findByIdAndUpdate
            updated.embedding = embedding;
            await updated.save();
            console.log(`[Embed Update] Successfully updated embedding for '${updated.name}'.`);
          }
        } catch (embedErr) {
          // Log the error but don't fail the entire request, as the main update succeeded
          console.error(`[Embed Update] Failed to update embedding for item ${updated._id}:`, embedErr?.message || embedErr);
        }
        // --- END NEW LOGIC ---

        // Log the item update
        await LoggerService.logItem(
          "item_updated",
          updated,
          req.user,
          {
            itemName: updated.name,
            updatedFields: Object.keys(updates).filter(
              (key) => updates[key] !== undefined
            ),
          },
          req
        );
  
        res.json({ success: true, ItemData: updated });
      } catch (err) {
        console.error("Error updating item:", err.message);
        res
          .status(500)
          .json({ success: false, message: "Server error updating item" });
      }
    }
  );
// "Delete" item (soft delete)
app.delete('/api/items/:id', authenticateToken, authorizeRoles("admin"), async (req, res) => {
    try {
        console.log(`🗑️  [Soft-Delete] Disabling Item ${req.params.id}`);
        const updated = await Item.findByIdAndUpdate(
            req.params.id,
            { status: 0 },
            { new: true }
        );
        if (!updated) {
            return res.status(404).json({ success: false, message: "Item not found" });
        }
        // Log the soft-delete action
        await LoggerService.logItem('item_deleted', updated, req.user, {
            previousStatus: 1,
            newStatus: 0
        }, req);

        res.json({ success: true, message: "Item disabled successfully", ItemData: updated });
    } catch (err) {
        res.status(500).json({ success: false, message: "Error disabling item", error: err.message });
    }
});
// Reactivate item
app.put('/api/items/:id/activate', authenticateToken, authorizeRoles("admin"), async (req, res) => {
    try {
        console.log(`🔄  [Activate] Re-enabling Item ${req.params.id}`);
        const updated = await Item.findByIdAndUpdate(
            req.params.id,
            { status: 1 },
            { new: true }
        );
        if (!updated) return res.status(404).json({ success: false, message: 'Item not found' });
        // Log the activation action
        await LoggerService.logItem('item_activated', updated, req.user, {
            previousStatus: 0,
            newStatus: 1
        }, req);

        res.json({ success: true, message: 'Item activated successfully', ItemData: updated });
    } catch (err) {
        console.error('Error activating item:', err.message);
        res.status(500).json({ success: false, message: 'Server error activating item' });
    }
});

















// ---------------------------------------------------------------------
// NEW: CALCULATE CUSTOM PRICE ENDPOINT (replaces /custom-quote)
// ---------------------------------------------------------------------
app.post('/api/items/:id/calculate-price', async (req, res) => {
    try {
        const item = await Item.findById(req.params.id);
        if (!item || !item.is_customizable) {
            return res.status(404).json({ message: "Customizable item not found." });
        }

        const { length, width, height, laborDays, materialName3x3, materialName2x12 } = req.body;
        if (!length || !width || !height || !laborDays || !materialName3x3 || !materialName2x12) {
            return res.status(400).json({ message: "Missing required dimension or material information." });
        }

        const mat3 = item.customization_options?.materials?.find(m => m.name === materialName3x3);
        const mat2 = item.customization_options?.materials?.find(m => m.name === materialName2x12);

        if (!mat3 || !mat2) {
            return res.status(400).json({ message: "Selected materials are not available for this item." });
        }

        const costs = {
            labor_cost_per_day: item.customization_options.labor_cost_per_day,
            plank_3x3_cost: mat3.plank_3x3x10_cost,
            plank_2x12_cost: mat2.plank_2x12x10_cost,
            profit_margin: item.customization_options.profit_margin,
            overhead_cost: item.customization_options.overhead_cost,
        };

        const priceDetails = calculateCustomPrice({ length, width, height }, laborDays, costs);
        return res.json(priceDetails);
    } catch (error) {
        console.error('Price calculation error:', error);
        res.status(500).json({ message: 'Server error during price calculation.' });
    }
});
// Items Recommendation
app.post("/api/items/recommend", async (req, res) => {
    console.log(
      "--- GROQ-POWERED COMPLEMENTARY RECOMMENDATION ENGINE STARTED ---"
    );
    try {
      const { selectedIds } = req.body;
      console.log(
        "[GROQ-REC]: Received request for recommendations based on cart items:",
        selectedIds
      );
  
      if (!Array.isArray(selectedIds) || selectedIds.length === 0) {
        console.log("[GROQ-REC-ERROR]: No item IDs provided.");
        return res
          .status(400)
          .json({
            success: false,
            message: "Item IDs are required to generate recommendations.",
          });
      }
  
      // 1. Fetch the cart items with full details
      console.log("[GROQ-REC]: Fetching cart items from database...");
      const cartItems = await Item.find({ _id: { $in: selectedIds } })
        .select("name description category furnituretype price")
        .populate("category", "name")
        .populate("furnituretype", "name");
  
      if (cartItems.length === 0) {
        console.log("[GROQ-REC-ERROR]: No valid items found in cart.");
        return res
          .status(404)
          .json({ success: false, message: "Cart items not found." });
      }
  
      console.log(`[GROQ-REC]: Found ${cartItems.length} items in cart`);
  
      // 2. Use Groq to analyze cart and generate complementary product recommendations
      let complementaryAnalysis;
      try {
        complementaryAnalysis = await generateComplementaryRecommendationsWithOpenAI(
          cartItems
        );
        console.log(
          "[GROQ-REC]: Groq analysis completed:",
          complementaryAnalysis
        );
      } catch (groqError) {
        console.error("[GROQ-REC]: Error calling Groq API:", groqError);
        // Fallback analysis if Groq fails
        complementaryAnalysis = {
          complementaryQuery: "furniture accessories storage lighting",
          reasoning: "General furniture accessories and complements",
          detectedRoom: "general",
          completionLevel: "unknown",
          priorityItems: ["lighting", "storage", "accessories"],
          filters: {},
        };
      }
  
      // 3. Search for complementary items based on Groq's recommendations
      const searchTerms = complementaryAnalysis.complementaryQuery
        ? complementaryAnalysis.complementaryQuery.split(" ")
        : ["furniture", "accessories"];
      const excludeTerms = complementaryAnalysis.filters?.exclude || [];
  
      // Build search query
      const searchQueries = searchTerms.map((term) => ({
        $or: [
          { name: { $regex: term, $options: "i" } },
          { description: { $regex: term, $options: "i" } },
        ],
      }));
  
      // Build exclude query
      const excludeQueries = excludeTerms.map((term) => ({
        $and: [
          { name: { $not: { $regex: term, $options: "i" } } },
          { description: { $not: { $regex: term, $options: "i" } } },
        ],
      }));
  
      // 4. Find complementary items
      const baseQuery = {
        $and: [
          { $or: searchQueries },
          { _id: { $nin: selectedIds } }, // Exclude cart items
          { status: 1 }, // Only active items
          { stock: { $gt: 0 } }, // Only items in stock
          ...excludeQueries, // Exclude unwanted categories
        ],
      };
  
      // Apply price filter if specified
      if (complementaryAnalysis.filters?.maxPrice) {
        baseQuery.$and.push({
          price: { $lte: complementaryAnalysis.filters.maxPrice },
        });
      }
  
      let complementaryItems = await Item.find(baseQuery)
        .populate("category", "name")
        .populate("furnituretype", "name")
        .sort({ sales: -1, createdAt: -1 }) // Prefer popular items
        .limit(3)
        .select(
          "_id name description price imageUrl category furnituretype sales"
        );
  
      console.log(
        `[GROQ-REC]: Found ${complementaryItems.length} complementary recommendations`
      );
  
      // 5. If we don't have enough results, try a broader search
      if (complementaryItems.length < 2) {
        console.log("[GROQ-REC]: Expanding search with priority items...");
  
        const priorityTerms = complementaryAnalysis.priorityItems || [
          "furniture",
          "accessories",
        ];
        if (priorityTerms.length > 0) {
          const broadQuery = {
            $and: [
              {
                $or: priorityTerms.map((term) => ({
                  $or: [
                    { name: { $regex: term, $options: "i" } },
                    { description: { $regex: term, $options: "i" } },
                  ],
                })),
              },
              { _id: { $nin: selectedIds } },
              { status: 1 },
              { stock: { $gt: 0 } },
            ],
          };
  
          const additionalItems = await Item.find(broadQuery)
            .populate("category", "name")
            .populate("furnituretype", "name")
            .sort({ is_bestseller: -1, sales: -1 })
            .limit(3 - complementaryItems.length)
            .select(
              "_id name description price imageUrl category furnituretype sales"
            );
  
          complementaryItems = [...complementaryItems, ...additionalItems];
        }
      }
  
      // 6. If still no results, get some bestsellers excluding cart items
      if (complementaryItems.length === 0) {
        console.log(
          "[GROQ-REC]: No specific matches found, getting bestsellers..."
        );
        complementaryItems = await Item.find({
          _id: { $nin: selectedIds },
          status: 1,
          stock: { $gt: 0 },
          is_bestseller: true,
        })
          .populate("category", "name")
          .populate("furnituretype", "name")
          .sort({ sales: -1 })
          .limit(3)
          .select(
            "_id name description price imageUrl category furnituretype sales"
          );
      }
  
      // 7. NEW: Handle AI-specific recommendations if available
      let aiSpecificRecommendations = [];
      if (complementaryAnalysis.specificRecommendations && complementaryAnalysis.specificRecommendations.length > 0) {
        console.log("[GROQ-REC]: Processing AI-specific recommendations...");
        
        // Get the exact items recommended by AI
        const recommendedItemNames = complementaryAnalysis.specificRecommendations.map(rec => rec.itemName);
        console.log("[GROQ-REC]: AI recommended items:", recommendedItemNames);
        
        // First try exact match
        let specificItems = await Item.find({
          name: { $in: recommendedItemNames },
          _id: { $nin: selectedIds }, // Exclude cart items
          status: 1,
          stock: { $gt: 0 }
        })
        .populate("category", "name")
        .populate("furnituretype", "name")
        .select("_id name description price imageUrl category furnituretype sales");
  
        console.log(`[GROQ-REC]: Found ${specificItems.length} exact matches`);
  
        // If no exact matches, try fuzzy matching
        if (specificItems.length === 0) {
          console.log("[GROQ-REC]: No exact matches found, trying fuzzy matching...");
          
          for (const recommendedName of recommendedItemNames) {
            // Try to find items that contain keywords from the recommended name
            const keywords = recommendedName.toLowerCase().split(' ').filter(word => word.length > 2);
            
            const fuzzyQuery = {
              $and: [
                { _id: { $nin: selectedIds } },
                { status: 1 },
                { stock: { $gt: 0 } },
                {
                  $or: keywords.map(keyword => ({
                    name: { $regex: keyword, $options: "i" }
                  }))
                }
              ]
            };
  
            const fuzzyMatches = await Item.find(fuzzyQuery)
              .populate("category", "name")
              .populate("furnituretype", "name")
              .select("_id name description price imageUrl category furnituretype sales")
              .limit(1);
  
            if (fuzzyMatches.length > 0) {
              specificItems.push(fuzzyMatches[0]);
              console.log(`[GROQ-REC]: Found fuzzy match for "${recommendedName}": "${fuzzyMatches[0].name}"`);
            }
          }
        }
  
        // Match AI recommendations with actual items and add reasoning
        aiSpecificRecommendations = specificItems.map(item => {
          const aiRec = complementaryAnalysis.specificRecommendations.find(rec => 
            rec.itemName.toLowerCase() === item.name.toLowerCase()
          );
          
          // If no exact match found, use the first recommendation's reasoning
          const fallbackReason = complementaryAnalysis.specificRecommendations[0]?.reason || 
            "Perfect complement to your selection";
          
          return {
            ...item.toObject(),
            aiReasoning: aiRec ? aiRec.reason : fallbackReason,
            isFuzzyMatch: !aiRec // Flag to indicate this was a fuzzy match
          };
        });
  
        console.log(`[GROQ-REC]: Final AI-specific recommendations: ${aiSpecificRecommendations.length} items`);
      }
  
      // 7. Generate AI explanations for all recommendations
      console.log("[GROQ-REC]: Generating AI explanations for recommendations...");
      let finalRecommendations = [...complementaryItems];
      if (aiSpecificRecommendations.length > 0) {
        finalRecommendations = [...aiSpecificRecommendations, ...complementaryItems];
      }
      
      // Use generateItemExplanations instead of generateCheckoutExplanations
      const recommendationsWithExplanations = await generateItemExplanations(
        finalRecommendations,
        "Cart-based recommendations", // originalQuery
        {
          customerIntent: "Looking for complementary furniture based on cart items",
          targetRoom: complementaryAnalysis.detectedRoom || "general",
          recommendationType: "completion"
        }
      );
      console.log(`[GROQ-REC]: Generated explanations for ${recommendationsWithExplanations.length} items`);
      
      console.log(
        "--- GROQ-POWERED COMPLEMENTARY RECOMMENDATION ENGINE COMPLETED ---"
      );
      res.json({
        success: true,
        ItemData: recommendationsWithExplanations, // Now includes aiExplanation
        aiSpecificRecommendations: aiSpecificRecommendations,
        analysis: {
          reasoning:
            complementaryAnalysis.reasoning ||
            "Recommended items that complement your selection",
          detectedRoom: complementaryAnalysis.detectedRoom || "general",
          completionLevel:
            complementaryAnalysis.completionLevel || "improving your setup",
          specificRecommendations: complementaryAnalysis.specificRecommendations || []
        },
      });
    } catch (err) {
      console.log("--- GROQ-POWERED RECOMMENDATION ENGINE FAILED ---");
      console.error("[GROQ-REC-ERROR]: An error occurred:", err.message);
      console.error("[GROQ-REC-ERROR]: Stack trace:", err.stack);
  
      // Return a fallback response instead of failing completely
      res.json({
        success: true,
        ItemData: [],
        analysis: {
          reasoning: "Unable to generate specific recommendations at this time",
          detectedRoom: "general",
          completionLevel: "Please browse our catalog for more items",
        },
      });
    }
  });



//ORDERS MANAGEMENT API--------------------------------------------------------

// Get all orders for the admin dashboard
app.get('/api/orders', authenticateToken, authorizeRoles("admin"), async (req, res) => {
    try {
        const orders = await Order.find({})
            .sort({ createdAt: -1 }) // Show newest orders first
            .populate('user', 'name email phone address') // Include address in population
            .populate('items.item', 'name price'); // Populate item name and price

        res.json({ success: true, OrderData: orders });
    } catch (err) {
        console.error('Error fetching all orders:', err.message);
        res.status(500).json({ success: false, message: 'Server error fetching orders' });
    }
});

// Update an order's status (e.g., to 'shipped', 'completed')
app.put('/api/orders/:id/status', authenticateToken, authorizeRoles("admin"), async (req, res) => {
    try {
        const { status, remarks = '' } = req.body;

        if (!status) {
            return res.status(400).json({ success: false, message: 'Status is required' });
        }

        // If status is Cancelled or Refunded, remarks are mandatory
        const REMARK_REQUIRED_STATUSES = ['Cancelled', 'Refunded'];
        if (REMARK_REQUIRED_STATUSES.includes(status) && !remarks.trim()) {
            return res.status(400).json({ success: false, message: 'Remarks are required for the selected status' });
        }

        const updateFields = { status };
        if (remarks.trim()) {
            updateFields.remarks = remarks.trim();
        }

        const updatedOrder = await Order.findByIdAndUpdate(
            req.params.id,
            updateFields,
            { new: true }
        ).populate('user', 'name email').populate('items.item', 'name price');

        if (!updatedOrder) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // Log status change
        await LoggerService.logOrder('order_status_changed', updatedOrder, req.user, {
            newStatus: status,
            remarks: remarks.trim() || undefined,
        }, req);

        res.json({ success: true, message: 'Order status updated', OrderData: updatedOrder });
    } catch (err) {
        console.error('Error updating order status:', err.message);
        res.status(500).json({ success: false, message: 'Server error updating status' });
    }
});

// Request a refund for an order
app.put('/api/orders/:id/refund-request', authenticateToken, async (req, res) => {
    try {
        // Find the order and verify it belongs to the requesting user
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // Ensure the requesting user is the owner of the order
        if (order.user.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Unauthorized to request refund for this order' });
        }

        // Check if the order is in a state where refunds are allowed
        if (order.status !== 'On Process') {
            return res.status(400).json({
                success: false,
                message: 'Refund can only be requested for orders that are still being processed'
            });
        }

        // Update order status to refund requested
        order.status = 'Requesting for Refund';
        order.refundReason = req.body.reason || 'Customer requested refund';
        order.refundRequestedAt = new Date();

        await order.save();

        // Log the refund request
        await LoggerService.logOrder('refund_requested', order, req.user, {
            reason: req.body.reason || 'No reason provided',
        }, req);

        res.json({
            success: true,
            message: 'Refund request submitted successfully',
            OrderData: order
        });

    } catch (err) {
        console.error('Error processing refund request:', err.message);
        res.status(500).json({ success: false, message: 'Server error processing refund request' });
    }
});

// Submit delivery proof and complete order
app.post('/api/orders/:id/delivery-proof', authenticateToken, authorizeRoles("admin"), upload.single('deliveryProof'), async (req, res) => {
    try {
        const orderId = req.params.id;

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Delivery proof image is required' });
        }

        // Upload image to Cloudinary
        const uploadStream = cloudinary.uploader.upload_stream(
            { folder: "delivery_proofs" },
            async (error, result) => {
                if (error) {
                    console.error('Cloudinary upload error:', error);
                    return res.status(500).json({ success: false, message: 'Failed to upload image' });
                }

                try {
                    // Update order with delivery proof and mark as completed
                    const updatedOrder = await Order.findByIdAndUpdate(
                        orderId,
                        {
                            status: 'completed',
                            deliveryProof: result.secure_url,
                            deliveryDate: new Date()
                        },
                        { new: true }
                    ).populate('user', 'name email').populate('items.item', 'name price');

                    if (!updatedOrder) {
                        return res.status(404).json({ success: false, message: 'Order not found' });
                    }

                    console.log(`Delivery proof submitted for order ${orderId}:`, result.secure_url);

                    res.json({
                        success: true,
                        message: 'Delivery proof submitted and order completed',
                        OrderData: updatedOrder,
                        deliveryProofUrl: result.secure_url
                    });
                } catch (updateError) {
                    console.error('Error updating order with delivery proof:', updateError);
                    res.status(500).json({ success: false, message: 'Failed to update order' });
                }
            }
        );

        uploadStream.end(req.file.buffer);

    } catch (err) {
        console.error('Error submitting delivery proof:', err.message);
        res.status(500).json({ success: false, message: 'Server error submitting delivery proof' });
    }
});

//CART MANAGEMENT API--------------------------------------------------------

// Show all items in a user's cart (protected)
app.get('/api/cart/:userId/items', authenticateToken, async (req, res) => {
    // Only allow the user or an admin to access this cart
    if (req.user.role !== "admin" && req.user._id.toString() !== req.params.userId) {
        return res.status(403).json({ success: false, message: "Access denied" });
    }
    try {
        const user = await User.findById(req.params.userId).populate({
            path: 'cart',
            populate: {
                path: 'items.item',
                model: 'Item'
            }
        });

        if (!user || !user.cart) {
            return res.status(404).json({ success: false, message: 'Cart not found' });
        }

        res.json({
            success: true,
            message: 'Cart items retrieved successfully',
            items: user.cart.items
        });

    } catch (err) {
        console.error('Error fetching cart:', err.message);
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
});
// Adding item to Cart
app.post('/api/cart/:userId/add', async (req, res) => {
    const { userId } = req.params;
    // Destructure all expected fields from the body
    const {
        itemId,
        quantity = 1,
        customPrice,
        customizations,
        customH,
        customW,
        customL,
        legsFrameMaterial,
        tabletopMaterial
    } = req.body;

    if (!itemId || quantity <= 0) {
        return res.status(400).json({
            success: false,
            message: 'Item ID and positive quantity are required',
        });
    }

    try {
        // Find user and ensure they exist
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Find the item and check stock
        const item = await Item.findById(itemId);
        if (!item) {
            return res.status(404).json({ success: false, message: 'Item not found' });
        }

        // Find user's cart
        let cart = await Cart.findOne({ user: userId });
        if (!cart) {
            cart = new Cart({ user: userId, items: [] });
        }

        // For customized items, always add as a new entry. Don't merge.
        const isCustom = customizations && Object.keys(customizations).length > 0;
        const existingItemIndex = isCustom ? -1 : cart.items.findIndex(i =>
            i.item.toString() === itemId && !i.customizations
        );

        let newQuantity = quantity;
        if (existingItemIndex !== -1) {
            newQuantity += cart.items[existingItemIndex].quantity;
        }

        if (newQuantity > item.stock && !isCustom) { // Stock check for non-custom items
            return res.status(400).json({
                success: false,
                message: `Max Stock Reached! (${item.stock})`
            });
        }

        if (existingItemIndex !== -1) {
            cart.items[existingItemIndex].quantity = newQuantity;
        } else {
            // Prepare the new item object for the cart
            const newItem = {
                item: itemId,
                quantity,
                customizations: isCustom ? customizations : null,
            };

            // If it's a custom item, add all the custom fields
            if (isCustom) {
                newItem.customH = customH;
                newItem.customW = customW;
                newItem.customL = customL;
                newItem.legsFrameMaterial = legsFrameMaterial;
                newItem.tabletopMaterial = tabletopMaterial;
                newItem.customPrice = customPrice;
            }

            cart.items.push(newItem);
        }

        await cart.save();
        await cart.populate('items.item');

        res.status(200).json({
            success: true,
            message: 'Item added to cart',
            CartData: cart,
        });
    } catch (err) {
        console.error('Error adding to cart:', err.message);
        res.status(500).json({
            success: false,
            message: 'Server error adding item to cart',
            error: err.message,
        });
    }
});
// delete a item from cart
app.delete('/api/cart/:userId/item/:itemId', authenticateToken, async (req, res) => {
    const { userId, itemId } = req.params;

    try {
        // Validate ObjectIds
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, message: "Invalid user ID format" });
        }
        if (!mongoose.Types.ObjectId.isValid(itemId)) {
            return res.status(400).json({ success: false, message: "Invalid item ID format" });
        }

        // Check if user has permission to modify this cart
        if (req.user.role !== "admin" && req.user.id !== userId) {
            return res.status(403).json({ success: false, message: "Access denied" });
        }

        // Find user's cart
        const cart = await Cart.findOne({ user: userId });

        if (!cart) {
            return res.status(404).json({ success: false, message: "Cart not found for user" });
        }

        // Filter out the item
        const initialLength = cart.items.length;
        cart.items = cart.items.filter(i => i.item.toString() !== itemId);

        if (cart.items.length === initialLength) {
            return res.status(404).json({ success: false, message: "Item not found in cart" });
        }

        // Save and return updated cart
        await cart.save();

        // Try to populate, but handle errors gracefully
        try {
            const populatedCart = await cart.populate('items.item');
            res.json({ success: true, message: "Item removed from cart", CartData: populatedCart });
        } catch (populateError) {
            console.error("Error populating cart after deletion:", populateError.message);
            // Return without population if it fails
            res.json({ success: true, message: "Item removed from cart", CartData: cart });
        }

    } catch (err) {
        console.error("Error deleting item from cart:", err.message);
        console.error("Full error:", err);
        res.status(500).json({
            success: false,
            message: "Server error deleting item from cart",
            error: err.message,
            details: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
});
// Increase or decrease item quantity in cart
app.put('/api/cart/:userId/item/:itemId/increase', async (req, res) => {
    const { userId, itemId } = req.params;

    try {
        const cart = await Cart.findOne({ user: userId });

        if (!cart) {
            return res.status(404).json({ success: false, message: "Cart not found" });
        }

        const cartItem = cart.items.find(i => i.item.toString() === itemId);

        if (!cartItem) {
            return res.status(404).json({ success: false, message: "Item not in cart" });
        }

        cartItem.quantity += 1;

        await cart.save();
        const populated = await cart.populate('items.item');

        res.json({ success: true, message: "Item quantity increased", CartData: populated });

    } catch (err) {
        console.error("Error increasing quantity:", err.message);
        res.status(500).json({ success: false, message: "Server error", error: err.message });
    }
});
// Decrease item quantity in cart
app.put('/api/cart/:userId/item/:itemId/decrease', async (req, res) => {
    const { userId, itemId } = req.params;

    try {
        const cart = await Cart.findOne({ user: userId });

        if (!cart) {
            return res.status(404).json({ success: false, message: "Cart not found" });
        }

        const cartItem = cart.items.find(i => i.item.toString() === itemId);

        if (!cartItem) {
            return res.status(404).json({ success: false, message: "Item not in cart" });
        }

        cartItem.quantity -= 1;

        // Remove item if quantity is now 0 or less
        if (cartItem.quantity <= 0) {
            cart.items = cart.items.filter(i => i.item.toString() !== itemId);
        }

        await cart.save();
        const populated = await cart.populate('items.item');

        res.json({ success: true, message: "Item quantity decreased", CartData: populated });

    } catch (err) {
        console.error("Error decreasing quantity:", err.message);
        res.status(500).json({ success: false, message: "Server error", error: err.message });
    }
});



//STOCK MANAGEMENT API---------------------------------------------------

//decrease stock of items
app.post('/api/items/decrease-stock', async (req, res) => {
    try {
        const { items } = req.body; // [{ itemId, quantity }]
        if (!Array.isArray(items)) {
            return res.status(400).json({ success: false, message: 'Invalid items array' });
        }
        for (const entry of items) {
            await Item.findByIdAndUpdate(
                entry.itemId,
                { $inc: { stock: -Math.abs(entry.quantity) } }
            );
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error decreasing stock', error: err.message });
    }
});

// Fetch cart by ID
app.get('/api/cart/:id', authenticateToken, async (req, res) => {
    try {
        const cart = await Cart.findById(req.params.id).populate('items.item');
        if (!cart) {
            return res.status(404).json({ error: "Cart not found" });
        }
        res.json(cart);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

//================================================================
// CATEGORY & FURNITURE TYPE API
//================================================================

// --------- Category Endpoints ---------

// Get all categories (active by default for users, all for admin view)
app.get('/api/categories', async (req, res) => {
    try {
        const includeInactive = req.query.includeInactive === 'true';
        // By default, the filter is { status: 1 } unless specified otherwise
        const filter = includeInactive ? {} : { status: 1 };
        console.log(`[GET /api/categories] includeInactive=${includeInactive}`);
        const categories = await Category.find(filter).sort('name');
        res.json({ success: true, CategoryData: categories });
    } catch (err) {
        console.error('Error fetching categories:', err.message);
        res.status(500).json({ success: false, message: 'Server error fetching categories' });
    }
});

// Create category (admin only)
app.post('/api/categories', authenticateToken, authorizeRoles("admin"), async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ success: false, message: 'Name is required' });

        // Ensure uniqueness
        const exists = await Category.findOne({ name });
        if (exists) return res.status(409).json({ success: false, message: 'Category already exists' });

        const newCategory = new Category({ name });
        await newCategory.save();
        res.status(201).json({ success: true, CategoryData: newCategory });
    } catch (err) {
        console.error('Error creating category:', err.message);
        res.status(500).json({ success: false, message: 'Server error creating category' });
    }
});

// "Delete" category (soft delete)
app.delete('/api/categories/:id', authenticateToken, authorizeRoles("admin"), async (req, res) => {
    try {
        console.log(`🗑️  [Soft-Delete] Disabling Category ${req.params.id}`);
        const updated = await Category.findByIdAndUpdate(
            req.params.id,
            { status: 0 }, // Set status to inactive
            { new: true }
        );
        if (!updated) {
            console.log("⚠️  Category not found – nothing disabled");
            return res.status(404).json({ success: false, message: 'Category not found' });
        }
        res.json({ success: true, message: 'Category disabled', CategoryData: updated });
    } catch (err) {
        console.error('Error disabling category:', err.message);
        res.status(500).json({ success: false, message: 'Server error disabling category' });
    }
});

// Reactivate category
app.put('/api/categories/:id/activate', authenticateToken, authorizeRoles("admin"), async (req, res) => {
    try {
        console.log(`🔄  [Activate] Re-enabling Category ${req.params.id}`);
        const updated = await Category.findByIdAndUpdate(
            req.params.id,
            { status: 1 }, // Set status to active
            { new: true }
        );
        if (!updated) return res.status(404).json({ success: false, message: 'Category not found' });
        res.json({ success: true, message: 'Category activated', CategoryData: updated });
    } catch (err) {
        console.error('Error activating category:', err.message);
        res.status(500).json({ success: false, message: 'Server error activating category' });
    }
});


// --------- Furniture Type Endpoints ---------

// Get all furniture types (active by default)
app.get('/api/furnituretypes', async (req, res) => {
    try {
        const includeInactive = req.query.includeInactive === 'true';
        const filter = includeInactive ? {} : { status: 1 };
        console.log(`[GET /api/furnituretypes] includeInactive=${includeInactive}`);
        const types = await FurnitureType.find(filter).sort('name');
        res.json({ success: true, FurnitureTypeData: types });
    } catch (err) {
        console.error('Error fetching furniture types:', err.message);
        res.status(500).json({ success: false, message: 'Server error fetching furniture types' });
    }
});

// Create furniture type (admin only)
app.post('/api/furnituretypes', authenticateToken, authorizeRoles("admin"), async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ success: false, message: 'Name is required' });
        const exists = await FurnitureType.findOne({ name });
        if (exists) return res.status(409).json({ success: false, message: 'Furniture type already exists' });
        const newType = new FurnitureType({ name });
        await newType.save();
        res.status(201).json({ success: true, FurnitureTypeData: newType });
    } catch (err) {
        console.error('Error creating furniture type:', err.message);
        res.status(500).json({ success: false, message: 'Server error creating furniture type' });
    }
});

// "Delete" furniture type (soft delete)
app.delete('/api/furnituretypes/:id', authenticateToken, authorizeRoles("admin"), async (req, res) => {
    try {
        console.log(`🗑️  [Soft-Delete] Disabling FurnitureType ${req.params.id}`);
        const updated = await FurnitureType.findByIdAndUpdate(
            req.params.id,
            { status: 0 },
            { new: true }
        );
        if (!updated) {
            return res.status(404).json({ success: false, message: 'Furniture type not found' });
        }
        res.json({ success: true, message: 'Furniture type disabled', FurnitureTypeData: updated });
    } catch (err) {
        console.error('Error disabling furniture type:', err.message);
        res.status(500).json({ success: false, message: 'Server error disabling furniture type' });
    }
});

// Reactivate furniture type
app.put('/api/furnituretypes/:id/activate', authenticateToken, authorizeRoles("admin"), async (req, res) => {
    try {
        console.log(`🔄  [Activate] Re-enabling FurnitureType ${req.params.id}`);
        const updated = await FurnitureType.findByIdAndUpdate(
            req.params.id,
            { status: 1 },
            { new: true }
        );
        if (!updated) return res.status(404).json({ success: false, message: 'Furniture type not found' }
        );
        res.json({ success: true, message: 'Furniture type activated', FurnitureTypeData: updated });
    } catch (err) {
        console.error('Error activating furniture type:', err.message);
        res.status(500).json({ success: false, message: 'Server error activating furniture type' });
    }
});

//================================================================
// END CATEGORY & FURNITURE TYPE API
//================================================================

// ======================= PSGC GEOLOCATION PROXY ENDPOINTS =======================
// Unified provinces endpoint: always returns two options: Metro Manila & Rizal
app.get('/api/psgc/provinces', async (req, res) => {
    try {
        console.log('Fetching provinces for Metro Manila & Rizal list...');

        // Fetch all provinces so we can locate Rizal (Metro Manila is a region, not a province)
        const { data } = await axios.get('https://psgc.gitlab.io/api/provinces/');

        const results = [];

        // Inject Metro Manila (region) as a pseudo-province so client can select it
        results.push({ name: 'Metro Manila', code: '130000000' }); // region code

        // Find Rizal from official list
        const rizal = data.find(p => p.name === 'Rizal');
        if (rizal) results.push(rizal);

        console.log('Returning provinces list:', results);
        res.json(results);

    } catch (err) {
        console.error('PSGC provinces fetch error:', err.message);
        res.status(500).json({ error: 'Failed to fetch provinces' });
    }
});

app.get('/api/psgc/cities/:cityCode/barangays', async (req, res) => {
    try {
        const { cityCode } = req.params;
        const { data } = await axios.get(`https://psgc.gitlab.io/api/cities-municipalities/${cityCode}/barangays/`);
        res.json(data);
    } catch (err) {
        console.error('PSGC barangays fetch error:', err.message);
        res.status(500).json({ error: 'Failed to fetch barangays' });
    }
});

// Fetch all cities / municipalities inside a specific province
app.get('/api/psgc/provinces/:provinceCode/cities', async (req, res) => {
    try {
        const { provinceCode } = req.params;

        // PSGC official endpoint for province -> cities / municipalities
        const { data } = await axios.get(`https://psgc.gitlab.io/api/provinces/${provinceCode}/cities-municipalities/`);

        res.json(data);
    } catch (err) {
        console.error('PSGC province cities fetch error:', err.message);
        // If PSGC returns 404, relay 404 to client; else generic 500
        if (err.response && err.response.status === 404) {
            return res.status(404).json({ error: 'Province not found' });
        }
        res.status(500).json({ error: 'Failed to fetch province cities' });
    }
});

// This endpoint is specifically for regions like NCR
app.get('/api/psgc/regions/:regionCode/cities', async (req, res) => {
    try {
        const { regionCode } = req.params;
        const { data } = await axios.get(`https://psgc.gitlab.io/api/regions/${regionCode}/cities-municipalities/`);
        res.json(data);
    } catch (err) {
        console.error('PSGC region cities fetch error:', err.message);
        res.status(500).json({ error: 'Failed to fetch region cities' });
    }
});
// ======================= END PSGC GEOLOCATION PROXY ENDPOINTS =======================

app.post('/api/orders/:id/complete-payment', authenticateToken, async (req, res) => {
    try {
        const { id: orderId } = req.params;
        const userId = req.user.id;

        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found.' });
        }

        if (order.user.toString() !== userId) {
            return res.status(403).json({ success: false, message: 'You are not authorized to pay for this order.' });
        }

        const amountToPay = Math.round(order.balance * 100);

        if (amountToPay <= 0) {
            return res.status(400).json({ success: false, message: 'No remaining balance to be paid.' });
        }

        const paymongoResponse = await axios.post('https://api.paymongo.com/v1/checkout_sessions', {
            data: {
                attributes: {
                    send_email_receipt: true,
                    show_line_items: true,
                    line_items: [{
                        currency: 'PHP',
                        amount: amountToPay,
                        name: `Remaining balance for Order #${order._id.toString().slice(-8)}`,
                        quantity: 1,
                    }],
                    payment_method_types: ['card', 'gcash'],
                    description: `Payment for Order #${order._id.toString().slice(-8)}`,
                    metadata: {
                        orderId: orderId,
                        paymentContext: 'completion'
                    }
                },
            },
        }, {
            headers: {
                "Content-Type": "application/json",
                Authorization: `Basic ${Buffer.from(
                    `${process.env.PAYMONGO_SECRET_KEY}:`
                ).toString("base64")}`,
            },
        });

        // Save the new transaction ID so the webhook can find this order
        const checkoutId = paymongoResponse.data.data.id;
        await Order.findByIdAndUpdate(orderId, {
            transactionId: checkoutId,
            paymentStatus: 'Fully Paid',
            balance: 0,
            paymentType: 'full_payment'
        });


        res.json({
            success: true,
            checkoutUrl: paymongoResponse.data.data.attributes.checkout_url
        });
    } catch (error) {
        console.error('Error creating complete payment session:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            message: 'Server error creating complete payment session',
            error: error.message
        });
    }
});

// TEST ENDPOINT: Manually add delivery proof to an order (for debugging)
app.post('/api/orders/:id/test-delivery-proof', authenticateToken, authorizeRoles("admin"), async (req, res) => {
    try {
        const orderId = req.params.id;
        const testImageUrl = "https://via.placeholder.com/400x300/10B981/FFFFFF?text=Delivery+Proof+Test";

        const updatedOrder = await Order.findByIdAndUpdate(
            orderId,
            {
                status: 'completed',
                deliveryProof: testImageUrl,
                deliveryDate: new Date()
            },
            { new: true }
        );

        if (!updatedOrder) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        console.log(`TEST: Added delivery proof to order ${orderId}`);
        res.json({
            success: true,
            message: 'Test delivery proof added',
            OrderData: updatedOrder
        });
    } catch (err) {
        console.error('Error adding test delivery proof:', err.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// LIST ALL ORDERS FOR TESTING: No authentication required
app.get('/api/test/orders/list', async (req, res) => {
    try {
        const orders = await Order.find({})
            .select('_id status user amount createdAt deliveryProof')
            .populate('user', 'name')
            .sort('-createdAt')
            .limit(10);

        console.log(`📋 Found ${orders.length} orders for testing`);

        res.json({
            success: true,
            message: `Found ${orders.length} orders`,
            orders: orders.map(o => ({
                id: o._id,
                status: o.status,
                customerName: o.user?.name || 'Unknown',
                amount: o.amount,
                createdAt: o.createdAt,
                hasDeliveryProof: !!o.deliveryProof,
                testUrl: `http://172.20.10.4:5000/api/test/orders/${o._id}/add-delivery-proof`
            }))
        });
    } catch (err) {
        console.error('📋 Error listing orders:', err.message);
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
});

// SIMPLE TEST ENDPOINT: No authentication required for quick testing
app.get('/api/test/orders/:id/add-delivery-proof', async (req, res) => {
    try {
        const orderId = req.params.id;
        const testImageUrl = "https://via.placeholder.com/400x300/10B981/FFFFFF?text=Test+Delivery+Proof";

        const updatedOrder = await Order.findByIdAndUpdate(
            orderId,
            {
                status: 'completed',
                deliveryProof: testImageUrl,
                deliveryDate: new Date()
            },
            { new: true }
        );

        if (!updatedOrder) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        console.log(`🧪 TEST: Added delivery proof to order ${orderId}`);
        res.json({
            success: true,
            message: 'Test delivery proof added successfully',
            OrderData: {
                id: updatedOrder._id,
                status: updatedOrder.status,
                deliveryProof: updatedOrder.deliveryProof,
                deliveryDate: updatedOrder.deliveryDate
            }
        });
    } catch (err) {
        console.error('🧪 Error adding test delivery proof:', err.message);
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
});

// listen to server
server.listen(process.env.PORT || 5000, () => { //3
    console.log(`Server is running on port ${process.env.PORT || 5000}`);
});

