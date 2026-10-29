function get(req, res) {
  const gameId = req.params.gameId;
  const username = req.session.user;

  console.log(`User '${username}' connected to game number ${gameId}.`);



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
