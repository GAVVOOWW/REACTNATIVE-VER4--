import mongoose from "mongoose";

const CategorySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    description: {
        type: String,
    },
    status: {
        type: Number,
        default: 1, // 1 for active, 0 for inactive
    },
}, { timestamps: true });

const Category = mongoose.model("Category", CategorySchema);

export default Category; 