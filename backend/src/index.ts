import "dotenv/config";
import express from "express";
import cors from "cors";
import { Express, Request, Response } from "express";
import { clerkMiddleware } from "@clerk/express";
import { FRONTEND_URL, PORT } from "./constants/env";
import connectToDb from "./lib/db";

const app: Express = express();

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
    res.status(200).json({ ok: true });
  },
);

app.use(function (_req, res: Response<{ message: string; ok: boolean }>): void {
  res.status(404).json({ message: "Route not found", ok: false });
});

(async function () {
  try {
    await connectToDb();
    app.listen(PORT, function () {
      console.log(`Server is listening on port: ${PORT}`);
    });
  } catch (error) {
    console.error(`Error in starting the server: ${error}`);
    process.exit(1);
  }
})();
