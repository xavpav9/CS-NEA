import express from "express";

const router = express.Router();

router.get("/", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("sessionId");
    res.send("You have been successfully logged out.");
  });
});

export default router;
