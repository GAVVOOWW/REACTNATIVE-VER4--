import mongoose from "mongoose";

const LogSchema = new mongoose.Schema({
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: String }, // Storing as plain string to avoid model discriminators
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    userName: { type: String },
    userRole: { type: String, default: "user" },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
    ipAddress: { type: String },
    userAgent: { type: String },
    timestamp: { type: Date, default: Date.now }
});

// Helper instance method – provides a human-readable description of the action
LogSchema.methods.getActionDescription = function () {
    return this.action ? this.action.replace(/_/g, " ") : "";
};

const Log = mongoose.model("Log", LogSchema);

export default Log; 