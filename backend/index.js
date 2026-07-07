import express from "express";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/auth.js";
dotenv.config();
import { requireAuth } from "./middleware/auth.js";
import documentRoutes from "./routes/documents.js";




const app = express();
const PORT = process.env.PORT || 6000;

app.use(express.json());
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/documents", documentRoutes);
app.get("/apis/protected-test", requireAuth, (req, res) => {
  res.json({ message: "You are authenticated", userId: req.userId });
});

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Server is running at ${PORT}`);
    });
  } catch (error) {
    console.error(error);
  }
};

startServer();
