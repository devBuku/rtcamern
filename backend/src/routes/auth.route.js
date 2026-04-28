import { Router } from "express";
import { body } from "express-validator";
import { signup } from "../controllers/auth.controller.js";

const router = Router();

router.post(
  "/signup",
  [
    body("email").isEmail(),
    body("fullname")
      .isLength({ min: 3 })
      .withMessage("Must be at least 3 characters long"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Must be at least 6 characters long"),
  ],
  signup,
);

export default router;
