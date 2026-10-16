import "dotenv/config";
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { Express, Request, Response } from "express";
import { clerkMiddleware } from "@clerk/express";
import { FRONTEND_URL, NODE_ENV, PORT } from "./constants/env";
import { NOT_FOUND, OK } from "./constants/http-status";
import connectToDb from "./lib/db";
import job from "./lib/cron";
import clerkWebhook from "./webhooks/clerk.webhook";
import authRouter from "./routes/auth.route";

const app: Express = express();
// Frontend build is copied to /app/public at image build time. Resolve it
// relative to the compiled file (dist/index.js -> ../public) so serving does
// not depend on the process working directory.
const publicDir = path.join(__dirname, "..", "public");

// it's important that we don't parse the webhook event data, it should be in the raw format
app.use(
  "/api/webhooks/clerk",
  express.raw({ type: "application/json" }),
  clerkWebhook,
);

app.use(express.json());
app.use(express.urlencoded());
app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  }),
);
app.use(clerkMiddleware());

app.get(
  "/health",
  function (_req: Request, res: Response<{ ok: boolean }>): void {
    res.status(OK).json({ ok: true });
  },
);

app.use("/api/auth", authRouter);

if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  app.get("/{*any}", function (req, res, next) {
    // API/unknown paths fall through to the JSON 404 handler below instead of
    // being answered with the SPA shell.
    if (req.path.startsWith("/api")) {
      next();
      return;
    }
    res.sendFile(path.join(publicDir, "index.html"), (err) => {
      if (err) next(err);
    });
  });
}

app.use(function (_req, res: Response<{ message: string; ok: boolean }>): void {
  res.status(NOT_FOUND).json({ message: "Route not found", ok: false });
});

(async function () {
  try {
    await connectToDb();
    app.listen(PORT, function () {
      console.log(`Server is listening on port: ${PORT}`);
    });
    if (NODE_ENV === "production") job.start();
  } catch (error) {
    console.error(`Error in starting the server: ${error}`);
    process.exit(1);
  }
})();
