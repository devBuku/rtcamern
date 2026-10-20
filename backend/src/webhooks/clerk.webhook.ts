import express from "express";
import User from "../models/user.model";
import { verifyWebhook } from "@clerk/backend/webhooks";
import { CLERK_WEBHOOK_SIGNING_SECRET } from "../constants/env";
import {
  BAD_REQUEST,
  INTERNAL_SERVER_ERROR,
  OK,
  SERVICE_UNAVAILABLE,
} from "../constants/http-status";

const router = express.Router();

router.post("/", async function (req, res) {
  const signingSecret = CLERK_WEBHOOK_SIGNING_SECRET;
  if (!signingSecret)
    return res
      .status(SERVICE_UNAVAILABLE)
      .json({ message: "Webhook secret is not provided!" });

  let evt: Awaited<ReturnType<typeof verifyWebhook>>;
  try {
    const payload = Buffer.isBuffer(req.body)
      ? req.body.toString("utf8")
      : String(req.body);
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === "string") headers.set(key, value);
      else if (Array.isArray(value)) headers.set(key, value.join(", "));
    }
    const request = new Request("http://internal/webhooks/clerk", {
      method: "POST",
      headers,
      body: payload,
    });
    evt = await verifyWebhook(request, { signingSecret });
  } catch (error) {
    console.error("Clerk webhook verification failed:", error);
    return res
      .status(BAD_REQUEST)
      .json({ message: "Webhook verification failed" });
  }

  try {
    if (evt.type === "user.created" || evt.type === "user.updated") {
      const u = evt.data;

      const email =
        u.email_addresses?.find((e) => e.id === u.primary_email_address_id)
          ?.email_address ?? u.email_addresses?.[0]?.email_address;

      const fullName =
        [u.first_name, u.last_name].filter(Boolean).join(" ") ||
        u.username ||
        email?.split("@")[0];

      await User.findOneAndUpdate(
        { clerkId: u.id },
        { clerkId: u.id, email, fullName, profilePic: u.image_url },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      );
    }

    if (evt.type === "user.deleted") {
      if (evt.data.id) await User.findOneAndDelete({ clerkId: evt.data.id });
    }

    res.status(OK).json({ received: true });
  } catch (error) {
    console.error("Error processing Clerk webhook:", error);
    res
      .status(INTERNAL_SERVER_ERROR)
      .json({ message: "Failed to process webhook" });
  }
});

export default router;
