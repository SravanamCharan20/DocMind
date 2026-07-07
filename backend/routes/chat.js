import express from "express";
import axios from "axios";
import { requireAuth } from "../middleware/auth.js";
import { ChatMessage } from "../models/ChatMessage.js";

const router = express.Router();

router.post("/query", requireAuth, async (req, res) => {
  try {
    const { question } = req.body;

    const fastApiResponse = await axios.get("http://127.0.0.1:8000/query", {
      params: { q: question },
    });

    const chatMessage = await ChatMessage.create({
      userId: req.userId,
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

export default router;