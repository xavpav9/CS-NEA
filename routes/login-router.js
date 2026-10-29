import express from "express";

const router = express.Router();

router.get("/", (req, res) => {
  let loginStatus;
  if (req.session.user) {
    loginStatus = `You are already logged in, ${req.session.user}`
  } else if (Math.random() < .5) {
    req.session.user = "random-username";
    res.cookie("sessionId", req.sessionID);

    loginStatus = "You have been logged in successfully";
  } else {
    loginStatus = "You have been randomly rejected";
  }

  res.render("login", {
    loginStatus,
  });
});

export default router;
