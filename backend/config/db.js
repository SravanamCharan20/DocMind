import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("DB Connected!!");
  } catch (error) {
    console.log("Error at DB Connection", error);
    process.exit(1);
  }
};
