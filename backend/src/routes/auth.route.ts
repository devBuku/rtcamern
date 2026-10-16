import { Router } from "express";
import { checkAuth } from "../controllers/auth.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const authRouter = Router();

authRouter.get("/me", authMiddleware, checkAuth);

export default authRouter;
