import mongoose from "mongoose";
import { DB_NAME, MONGO_URI } from "../constants/env";

const connectToDb = async function () {
  const conn = await mongoose.connect(MONGO_URI, {
    dbName: DB_NAME,
  });
  console.log(`Successfully connected to DB: ${conn.connection.host}`);
};

export default connectToDb;
