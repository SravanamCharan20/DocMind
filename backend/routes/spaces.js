import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { Space } from "../models/Space.js";

const router = express.Router();

router.post("/", requireAuth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Space name is required" });
    }

    const space = await Space.create({ name, userId: req.userId });
    res.status(201).json(space);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/", requireAuth, async (req, res) => {
  try {
    const spaces = await Space.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json(spaces);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const space = await Space.findOne({ _id: req.params.id, userId: req.userId });
    if (!space) {
      return res.status(404).json({ error: "Space not found" });
    }
    res.json(space);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;