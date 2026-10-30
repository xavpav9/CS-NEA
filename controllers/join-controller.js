import User from "./../models/user.js";

function getRoot(req, res) {
  res.render("join");
}

async function postRoot(req, res) {
  if (req.session.user) {
    const gameID = parseInt(req.body.gameID);

    // TODO: Wait until table is full before sending users to game.
    res.redirect(`/play/${gameID}`);
  } else {
    res.redirect("/account");
  }
}

export { getRoot, postRoot };
