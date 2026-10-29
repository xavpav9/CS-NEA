function get(req, res) {
  const gameID = req.params.gameID;
  const username = req.session.user;
  const userID = req.session.userID;

  console.log(`User '${username}' (${userID ? "" : "not "}signed in) connected to gameID ${gameID}.`);



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
