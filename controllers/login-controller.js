import bcrypt from "bcrypt";
import User from "./../models/user.js";

function getRoot(req, res) {
  if (req.session.user) res.redirect("/");
  else res.render("login");
}

async function postRoot(req, res) {
  const email = req.body.email;
  const password = req.body.password;
  // const hashedPassword = await bcrypt.hash(password, 1);

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
    // TODO: Redirect to register/signup
    res.render("login", {
      loginStatus: "No such user exists.",
    });
  }
}

export { getRoot, postRoot };
