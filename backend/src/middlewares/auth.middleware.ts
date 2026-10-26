import { clerkClient, getAuth } from "@clerk/express";
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

    let user = await User.findOne({ clerkId: userId }).select("-__v");

    if (!user) {
      try {
        const clerkUser = await clerkClient.users.getUser(userId);
        if (clerkUser) {
          const email =
            clerkUser.emailAddresses?.find(
              (e) => e.id === clerkUser.primaryEmailAddressId,
            )?.emailAddress ??
            clerkUser.emailAddresses?.[0]?.emailAddress ??
            `${userId}@placeholder.clerk`;

          const fullName =
            [clerkUser.firstName, clerkUser.lastName]
              .filter(Boolean)
              .join(" ")
              .trim() ||
            clerkUser.username ||
            email.split("@")[0] ||
            "User";

          const profilePic = clerkUser.imageUrl || "";

          const filter = email
            ? { $or: [{ clerkId: userId }, { email }] }
            : { clerkId: userId };

          user = await User.findOneAndUpdate(
            filter,
            { clerkId: userId, email, fullName, profilePic },
            {
              returnDocument: "after",
              upsert: true,
              setDefaultsOnInsert: true,
            },
          ).select("-__v");
        }
      } catch (clerkError) {
        console.error("Failed to lazy-sync user from Clerk:", clerkError);
      }
    }

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
