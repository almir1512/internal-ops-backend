const express = require("express");

const app = express();

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

const authRouter = require("./routes/auth");
app.use("/auth", authRouter);

const adminRouter = require("./routes/admin");
app.use("/admin", adminRouter);

const platformRouter = require("./routes/platform");
app.use("/platform", platformRouter);

module.exports = app;
