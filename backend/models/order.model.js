import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  amount: { type: Number, required: true },
  shippingFee: { type: Number, default: 0 },
  amountPaid: { type: Number, default: 0 },
  balance: { type: Number, default: 0 },
  paymentType: { type: String, enum: ['full_payment', 'down_payment'], default: 'full_payment' },
  paymentStatus: {
    type: String,
    enum: ['Downpayment Received', 'Ready for Pickup','Pending Full Payment', 'Fully Paid', `Refund Requested`, 'Refunded'],
    default: 'Pending'
  },
  status: {
    type: String,
    enum: [
      'Pending',              // Default state before any payment
      'On Process',           // For delivery after payment
      'Ready for Pickup',     // For pickup after payment
      'Delivered',            // For delivery after proof
      'Picked Up',            // For pickup after proof
      'Cancelled',
      'Requesting for Refund',
      'Refunded'
    ],
    default: 'Pending'
  },
  transactionId: { type: String },
  transactionHash: { type: String, unique: true, sparse: true },
  deliveryOption: { type: String, enum: ['delivery', 'pickup'], required: true },
  shippingFee: { type: Number, required: true },
  totalWithShipping: { type: Number, required: true },


  items: [
    {
      item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true },
      // Storing custom details directly in the order item
      customH: { type: Number, default: null },
      customW: { type: Number, default: null },
      customL: { type: Number, default: null },
      legsFrameMaterial: { type: String, default: null },
      tabletopMaterial: { type: String, default: null }
    }
  ],
  address: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  shippingAddress: {
    fullName: String,
    addressLine1: String,
    city: String,
    state: String,
    postalCode: String,
    phone: String,
  },
  deliveryProof: {
    type: String, // URL/path to the delivery proof image
    default: null
  },
  remarks: { type: String, default: '' },
  deliveryDate: {
    type: Date,
    default: null
  }
}, { timestamps: true });

export default mongoose.model('Order', orderSchema);