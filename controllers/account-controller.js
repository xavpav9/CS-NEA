import User from "./../models/user.js";

async function getRoot(req, res) {
  if (req.session.user) {
    const userInfo = await User.getUserInfoById(req.session.userID);
    if (userInfo) {
      res.render("account", {
        name: userInfo.name,
        email: userInfo.email,
        userID: userInfo.userid,
      });
      return;
    }
  }
  res.redirect("/login");
}

async function postRoot(req, res) {
  const userInfo = await User.getUserInfoById(req.session.userID);
  const newName = req.body.name;

  if (userInfo && newName.length && newName.length < 20) {
    await User.updateName(userInfo.userid, newName);
    req.session.user = newName;

    res.render("account", {
      name: newName,
      email: userInfo.email,
      userID: userInfo.userid,
    });
    return;
  }
  res.render("account", {
    name: userInfo.name,
    email: userInfo.email,
    userID: userInfo.userid,
  });
}

export { getRoot, postRoot };
