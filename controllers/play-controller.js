function get(req, res) {
  const gameID = req.params.gameID;
  const username = req.session.user;
  const userID = req.session.userID;

  req.session.gameID = gameID;




  res.render("play", {});
}

function handleGame(ws) {
  ws.send("connected");

  ws.on("message", () => {
    console.log("Received message.");
  });

  ws.on("close", () => {
    // Handle close properly
  });

}

export {get, handleGame};
