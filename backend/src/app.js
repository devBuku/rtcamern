import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import authRouter from "./routes/auth.route.js";
import messageRouter from "./routes/message.route.js";
import { NODE_ENV } from "./constants/env.js";

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.get("/health", (_req, res) => {
  res.status(200).json({ message: `Healthy` });
});

app.use("/api/auth", authRouter);
app.use("/api/messages", messageRouter);

if (NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../../frontend/dist")));

  app.use((_req, res) => {
    res.sendFile(path.join(__dirname, "../../frontend/dist/index.html"));
  });
}

export default app;
