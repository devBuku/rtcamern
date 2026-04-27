import dotenv from "dotenv";
dotenv.config({ quiet: true });

import express from "express";
import path from "path";

const app = express();

const port = process.env.PORT || 3000;

const __dirname = path.resolve();

app.get("/health", function (_req, res) {
  res.status(200).json({ status: "Healthy" });
});

// app.use("/api/v1/auth/", authRouter);
// app.use("/api/v1/auth/", messageRouter);

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  app.get("/", function (_req, res) {
    res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
  });
}

app.listen(port, function () {
  console.log(`App is listening to port ${port}`);
});
