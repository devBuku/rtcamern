import dotenv from "dotenv";
dotenv.config({ quiet: true });

import express from "express";
import path from "path";

import { connectToDb } from "./lib/db.js";
import authRouter from "./routes/auth.route.js";
import { ENV } from "./lib/env.js";

const app = express();

app.use(express.json());

const port = ENV.PORT;

const __dirname = path.resolve();

app.get("/health", function (_req, res) {
  res.status(200).json({ status: "Healthy" });
});

app.use("/api/v1/auth/", authRouter);
// app.use("/api/v1/auth/", messageRouter);

if (ENV.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  app.get("/", function (_req, res) {
    res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
  });
}

async function startServer() {
  await connectToDb();
  app.listen(port, function () {
    console.log(`App is listening to port ${port}`);
  });
}

startServer();
