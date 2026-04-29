import { Router } from "express";
import { body } from "express-validator";
import { signup, login, logout } from "../controllers/auth.controller.js";

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

router.post(
  "/login",
  [body("email").isEmail(), body("password").isLength({ min: 6 })],
  login,
);
router.post("/logout", logout);

export default router;
