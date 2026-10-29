function getRoot(req, res) {
  req.session.destroy(() => {
    res.clearCookie("sessionID");
    res.send("You have been successfully logged out.");
  });
}

export { getRoot };
