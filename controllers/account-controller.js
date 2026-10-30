import User from "./../models/user.js";

async function getRoot(req, res) {
  if (req.session.user) {
    const userInfo = await User.getUserInfoByID(req.session.userID);
    if (userInfo) {
      res.render("account", {
        loggedIn: true,
        name: userInfo.name,
        email: userInfo.email,
        userID: userInfo.user_id,
      });
      return;
    }
  }

  res.render("account", {
    loggedIn: false,
    name: req.session.user,
  });
}

async function postRoot(req, res) {
  const userInfo = await User.getUserInfoByID(req.session.userID);
  const newName = req.body.name;
  const validName = (newName.length) && (newName.length < 20);

  if (validName) req.session.user = newName;

  if (userInfo) { // Valid name and registered user
    if (validName) await User.updateName(userInfo.user_id, newName);

    res.render("account", {
      loggedIn: true,
      name: req.session.user,
      email: userInfo.email,
      userID: userInfo.user_id,
    });
    return;
  }

  res.render("account", {
    loggedIn: false,
    name: req.session.user,
  });
}

export { getRoot, postRoot };
