import express from "express";
import axios from "axios";
import { requireAuth } from "../middleware/auth.js";
import { ChatMessage } from "../models/ChatMessage.js";
import { Space } from "../models/Space.js";

const router = express.Router();

router.post("/query", requireAuth, async (req, res) => {
  try {
    const { question, spaceId } = req.body;

    const space = await Space.findOne({ _id: spaceId, userId: req.userId });
    if (!space) {
      return res.status(404).json({ error: "Space not found" });
    }

    const fastApiResponse = await axios.get("http://127.0.0.1:8000/query", {
      params: { q: question, space_id: spaceId },
    });

    const chatMessage = await ChatMessage.create({
      userId: req.userId,
      spaceId,
      question,
      answer: fastApiResponse.data.answer,
    });

    res.json({
      question: chatMessage.question,
      answer: chatMessage.answer,
      sources: fastApiResponse.data.after_rerank,
    });
  } catch (error) {
    if (error.response?.status === 503) {
      return res.status(503).json({ error: "Answer service temporarily unavailable, please try again shortly" });
    }
    res.status(500).json({ error: error.message });
  }
});

router.get("/history", requireAuth, async (req, res) => {
  try {
    const { spaceId } = req.query;
    const messages = await ChatMessage.find({ spaceId, userId: req.userId }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;