import express from "express";
import authRouter from "./routes/auth.route.js";
import messageRouter from "./routes/message.route.js";

const app = express();

app.get("/", function (_req, res) {
  res.status(200).json({ status: "Healthy" });
});

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/messages", messageRouter);

export default app;
