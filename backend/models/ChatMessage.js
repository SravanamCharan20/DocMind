import mongoose from "mongoose";

const chatMessageSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    question: { type: String, required: true },
    answer: { type: String, required: true },
    spaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Space", required: true },
  },
  { timestamps: true }
);

export const ChatMessage = mongoose.model("ChatMessage", chatMessageSchema);