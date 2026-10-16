import { getAuth } from "@clerk/express";
import { Request, Response, NextFunction } from "express";
import User from "../models/user.model";
import {
  NOT_FOUND,
  INTERNAL_SERVER_ERROR,
  UNAUTHORIZED,
} from "../constants/http-status";

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { userId } = getAuth(req);
    if (!userId)
      return res.status(UNAUTHORIZED).json({ message: "Unauthorized" });
    const user = await User.findOne({ clerkId: userId }).select("-__v");
    if (!user)
      return res
        .status(NOT_FOUND)
        .json({ message: "User profile is not synced yet" });
    req.user = user;
    next();
  } catch (error) {
    console.error("Error in authMiddleware:", error);
    res
      .status(INTERNAL_SERVER_ERROR)
      .json({ message: "Internal server error!" });
  }
}
