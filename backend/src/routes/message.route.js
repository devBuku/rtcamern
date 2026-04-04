import { Router } from "express";
const router = Router();

router.get("/send", function (req, res) {
  res.send("Send message endpoint");
});

export default router;
