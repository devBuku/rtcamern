const express = require("express");

const authRouter = require("./routes/auth.route.js");
const messageRouter = require("./routes/message.route.js");

const app = express();

app.get("/", function (req, res) {
  res.status(200).json({ status: "Healthy" });
});

app.use("/api/v1/auth/", authRouter);
app.use("/api/v1/auth/", messageRouter);

module.exports = app;
