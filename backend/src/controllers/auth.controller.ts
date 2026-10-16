import { Request, Response } from "express";
import { OK, UNAUTHORIZED } from "../constants/http-status";
const checkAuth = function (req: Request, res: Response) {
  if (!req.user)
    return res.status(UNAUTHORIZED).json({ message: "Unauthorized" });
  res.status(OK).json({ success: true, user: req.user });
};

export { checkAuth };
