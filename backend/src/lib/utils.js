import jwt from "jsonwebtoken";
import { ENV } from "./env.js";

export const generateToken = function (userId, res) {
  const token = jwt.sign({ userId: userId }, ENV.JWT_SECRET, {
    expiresIn: "7d",
  });
  res.cookie("jwt", token, {
    maxAge: 7 * 24 * 60 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "development" ? false : true,
  });
  return token;
};
