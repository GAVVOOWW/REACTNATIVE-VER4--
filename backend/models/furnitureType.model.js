import mongoose from "mongoose";

const FurnitureTypeSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    description: {
        type: String,
    },
    status: {
        type: Number,
        default: 1, // 1 for active, 0 for inactive
    },
}, { timestamps: true });

const FurnitureType = mongoose.model("FurnitureType", FurnitureTypeSchema);

export default FurnitureType; 