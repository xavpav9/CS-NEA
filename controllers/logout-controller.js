function getRoot(req, res) {
  req.session.destroy(() => {
    res.clearCookie("sessionID");
    res.redirect("/");
  });
}

export { getRoot };
