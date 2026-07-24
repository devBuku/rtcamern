import { Router } from "express";
import { sendMessageController } from "../controllers/message.controller.js";

const messageRouter = Router();

messageRouter.post("/send", sendMessageController);

export default messageRouter;
