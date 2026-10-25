import { NextFunction, Request, Response } from "express";
import multer from "multer";
import { MAX_FILE_SIZE } from "../constants/env";
import {
  BAD_REQUEST,
  INTERNAL_SERVER_ERROR,
  PAYLOAD_TOO_LARGE,
} from "../constants/http-status";

type ErrorWithStatus = Error & { status?: number };

// Must keep all four parameters: Express only treats a middleware as an error
// handler when it has the (err, req, res, next) signature.
export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      const maxMb = Math.round(MAX_FILE_SIZE / (1024 * 1024));
      return res
        .status(PAYLOAD_TOO_LARGE)
        .json({ message: `File too large. Maximum size is ${maxMb}MB.` });
    }
    return res.status(BAD_REQUEST).json({ message: error.message });
  }

  if (error instanceof Error) {
    const status = (error as ErrorWithStatus).status;
    if (typeof status === "number") {
      return res.status(status).json({ message: error.message });
    }
  }

  console.error("Unhandled error:", error);
  res.status(INTERNAL_SERVER_ERROR).json({ message: "Internal Server Error" });
}
