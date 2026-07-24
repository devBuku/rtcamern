import { Router } from "express";
import {
  loginController,
  logoutController,
  registerController,
} from "../controllers/auth.controller.js";

const authRouter = Router();

authRouter.post("/register", registerController);
authRouter.post("/login", loginController);
authRouter.post("/logout", logoutController);

export default authRouter;
