import { Router } from "express";
import {
  getConversationsForSidebar,
  getMessages,
  getUsersForSidebar,
  sendMessage,
} from "../controllers/message.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { upload } from "../middlewares/upload.middleware";

const messageRouter = Router();

messageRouter.use(authMiddleware);

messageRouter.get("/users", getUsersForSidebar);
messageRouter.get("/conversations", getConversationsForSidebar);
messageRouter.get("/:id", getMessages);

messageRouter.post("/send/:id", upload.single("media"), sendMessage);

export default messageRouter;
