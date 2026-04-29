import User from "../models/user.model.js";
import jwt from "jsonwebtoken";
import { ENV } from "../lib/env.js";

export const authMiddleware = async function (req, res, next) {
  try {
    const token = req.cookies.jwt;
    if (!token) return res.status(401).json({ message: `Unauthorized` });
    const decoded = jwt.verify(token, ENV.JWT_SECRET);
    if (!decoded) return res.status(401).json({ message: `Unauthorized` });
    const user = await User.findById(decoded.userId).select("-password");
    if (!user) return res.status(404).json({ message: `User not found` });
    req.user = user;
    next();
  } catch (error) {
    console.error(`Error in authMiddleware: ${error}`);
    res.status(500).json({ message: `Internal Server Error` });
  }
};
