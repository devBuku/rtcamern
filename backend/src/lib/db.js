import mongoose from "mongoose";
import { ENV } from "./env.js";

export const connectToDb = async function () {
  try {
    const conn = await mongoose.connect(ENV.MONGODB_URI);
    console.log(`Connected to DB: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error connecting to mongodb: ${error}`);
    process.exit(1);
  }
};
