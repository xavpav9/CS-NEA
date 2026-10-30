import bcrypt from "bcrypt";
import User from "./../models/user.js";

function getRoot(req, res) {
  res.render("register");
}

async function postRoot(req, res) {
  const email = req.body.email;
  const password = req.body.password;
  const hashedPassword = await bcrypt.hash(password, 1);

  const existingUserInfo = await User.getUserInfoByEmail(email);

  if (existingUserInfo) {
    res.render("register", {
      email,
      registerStatus: "Account already exists. Please login at <a href='/login'>/login</a>.",
    });
    return;
  }

  await User.addUser("Player", email, hashedPassword);
  const userInfo = await User.getUserInfoByEmail(email);
  console.log("u", userInfo);

  req.session.user = userInfo.name;
  req.session.userID = userInfo.user_id;
  res.cookie("sessionID", req.sessionID);
  res.redirect("/");
}

export { getRoot, postRoot };
