import { Request, Response } from "express";
import mongoose from "mongoose";
import {
  BAD_REQUEST,
  CREATED,
  INTERNAL_SERVER_ERROR,
  OK,
  UNAUTHORIZED,
} from "../constants/http-status";
import User from "../models/user.model";
import Message from "../models/message.model";
import uploadChatMedia from "../lib/imagekit";

const getUsersForSidebar = async function (req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(UNAUTHORIZED).json({ message: "Unauthorized" });
    }

    const loggedInUserId = req.user._id;
    const filteredUsers = await User.find({
      _id: { $ne: loggedInUserId },
    }).select("-clerkId");
    res.status(OK).json(filteredUsers);
  } catch (error) {
    console.error("Error in getUsersForSidebar:", error);
    res
      .status(INTERNAL_SERVER_ERROR)
      .json({ message: "Internal Server Error" });
  }
};

const getConversationsForSidebar = async function (
  req: Request,
  res: Response,
) {
  try {
    if (!req.user) {
      return res.status(UNAUTHORIZED).json({ message: "Unauthorized" });
    }
    const loggedInUserId = req.user._id;
    const conversations = await Message.aggregate([
      // keep only the messages I sent or received.
      {
        $match: {
          $or: [{ senderId: loggedInUserId }, { receiverId: loggedInUserId }],
        },
      },
      // Collapse them into one row per chat partner, noting our latest message time.
      {
        $group: {
          // The partner is the other person on the message (not me).
          _id: {
            $cond: [
              { $eq: ["$senderId", loggedInUserId] },
              "$receiverId",
              "$senderId",
            ],
          },
          lastMessageAt: { $max: "$createdAt" },
        },
      },
      {
        // Put the most recent conversation at the top.
        $sort: { lastMessageAt: -1 },
      },
      {
        // Look up each partner's user profile (comes back as an array)
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        // Drop conversations whose partner no longer exists (deleted user).
        // Without this, $replaceRoot below fails on a null/empty user.
        $match: { "user.0": { $exists: true } },
      },
      {
        // Pull that profile out of the array and make it the document.
        $replaceRoot: { newRoot: { $first: "$user" } },
      },
      {
        // Hide the private clerkId field from the result.
        $project: { clerkId: 0 },
      },
    ]);
    res.status(OK).json(conversations);
  } catch (error) {
    console.error("Error in getConversationsForSiderbar:", error);
    res
      .status(INTERNAL_SERVER_ERROR)
      .json({ message: "Internal Server Error" });
  }
};

const getMessages = async function (req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(UNAUTHORIZED).json({ message: "Unauthorized" });
    }

    const { id: userToChatId } = req.params;
    if (!userToChatId || !mongoose.isValidObjectId(userToChatId)) {
      return res.status(BAD_REQUEST).json({ message: "Invalid user id" });
    }

    const myId = req.user._id;
    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    }).sort({ createdAt: 1 });

    res.status(OK).json(messages);
  } catch (error) {
    console.error("Error in getMessages:", error);
    res
      .status(INTERNAL_SERVER_ERROR)
      .json({ message: "Internal Server Error" });
  }
};

const sendMessage = async function (req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(UNAUTHORIZED).json({ message: "Unauthorized" });
    }

    const { text } = req.body;
    const { id: receiverId } = req.params;
    if (!receiverId || !mongoose.isValidObjectId(receiverId)) {
      return res.status(BAD_REQUEST).json({ message: "Invalid receiver id" });
    }
    if (!req.file && !text) {
      return res
        .status(BAD_REQUEST)
        .json({ message: "Message must contain text or media" });
    }

    const senderId = req.user._id;

    let imageUrl: string | null = null;
    let videoUrl: string | null = null;

    if (req.file) {
      const fileForUpload = {
        buffer: req.file.buffer,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
      };
      const url = await uploadChatMedia(fileForUpload);
      if (req.file.mimetype.startsWith("video/")) videoUrl = url;
      else imageUrl = url;
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
      video: videoUrl,
    });
    await newMessage.save();
    res.status(CREATED).json(newMessage);
  } catch (error) {
    console.error("Error in sendMessage:", error);
    res
      .status(INTERNAL_SERVER_ERROR)
      .json({ message: "Internal Server Error" });
  }
};

export {
  getUsersForSidebar,
  getConversationsForSidebar,
  getMessages,
  sendMessage,
};
