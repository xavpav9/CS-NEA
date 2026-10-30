function get(req, res) {
  const gameID = req.params.gameID;
  const username = req.session.user;
  const userID = req.session.userID;




  res.render("play", {});
}

function handleGame(ws) {
  ws.send("connected");

  ws.on("message", () => {
    console.log("hi");
  });

  ws.on("close", () => {
    // Handle close properly
  });

}

export {get, handleGame};
