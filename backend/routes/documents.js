import express from "express";
import multer from "multer";
import axios from "axios";
import FormData from "form-data";
import { requireAuth } from "../middleware/auth.js";
import { Document } from "../models/Document.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/upload", requireAuth, upload.single("file"), async (req, res) => {
  try {
    const formData = new FormData();
    formData.append("file", req.file.buffer, req.file.originalname);

    const fastApiResponse = await axios.post(
      "http://127.0.0.1:8000/upload",
      formData,
      { headers: formData.getHeaders() }
    );

    const doc = await Document.create({
      userId: req.userId,
      filename: fastApiResponse.data.filename,
      numChunks: fastApiResponse.data.num_chunks,
    });

    res.status(201).json(doc);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;