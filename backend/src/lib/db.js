import mongoose from "mongoose";

export const connectToDb = async function () {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`Connected to DB: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error connecting to mongodb: ${error}`);
    process.exit(1);
  }
};
