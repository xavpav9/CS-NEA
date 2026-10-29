import User from "./../models/user.js";

async function getRoot(req, res) {
  let loginStatus = "";

  if (req.session.user) {
    loginStatus = `You are already logged in, ${req.session.user}.`
  } else if (Math.random() < .5) {
    let id = 1;
    let password = "123412341234"; //TODO: Hash password (bcrypt)
    const userInfo = await User.getUserInfoById(id);

    if (userInfo) {
      if (userInfo.password === password) {
        req.session.user = userInfo.name;
        req.session.userid = userInfo.userid;
        res.cookie("sessionId", req.sessionID);

        loginStatus = `You have been logged in successfully, ${userInfo.name}.`;
      } else {
        loginStatus = "Wrong password."
      }
    } else {
      loginStatus = "No user recorded.";
    }
  } else {
    loginStatus = "You have been randomly rejected.";
  }

  res.render("login", {
    loginStatus,
  });
}

export { getRoot };
