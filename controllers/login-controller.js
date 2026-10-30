import bcrypt from "bcrypt";
import User from "./../models/user.js";

function getRoot(req, res) {
  if (req.session.userID) res.redirect("/");
  else res.render("login");
}

async function postRoot(req, res) {
  const email = req.body.email;
  const password = req.body.password;

  const userInfo = await User.getUserInfoByEmail(email);

  if (userInfo) {
    const match = await bcrypt.compare(password, userInfo.password);
    if (match) {
      req.session.user = userInfo.name;
      req.session.userID = userInfo.userid;
      res.cookie("sessionID", req.sessionID);

      res.redirect("/");
    } else {
      res.render("login", {
        email,
        loginStatus: "Wrong password.",
      });
    }
  } else {
    res.render("login", {
      email,
      loginStatus: "No such user exists. Register at <a href='/register'>/register</a>.",
    });
  }
}

export { getRoot, postRoot };
