import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    filename: { type: String, required: true },
    numChunks: { type: Number, required: true },
  },
  { timestamps: true }
);

export const Document = mongoose.model("Document", documentSchema);