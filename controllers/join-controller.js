import User from "./../models/user.js";
import GameUser from "./../models/game-user.js";
import CurrentGame from "./../models/current-game.js";

// TODO:
// - Send all users to /play/gameID upon table filling, not just the most recent to join.
// - Remove User from table if they leave (disconnect from websocket).
// - Move User to another table if they click on one.

function getRoot(req, res) {
  res.render("join");
}

async function postRoot(req, res) {
  if (req.session.user) {
    console.log(req.session.gameID);
    if (!req.session.gameID) {
      const userID = parseInt((req.session.userID) ? req.session.userID : 1);
      const gameID = parseInt(req.body.gameID);
      let gameInfo = await CurrentGame.getGameInfoByID(gameID);

      if (!gameInfo) {
        await CurrentGame.addGame(gameID, 4, 0);
        gameInfo = await CurrentGame.getGameInfoByID(gameID);
      }

      const existingGameUsers = await GameUser.getGameUsersInfoByGameID(gameID);

      await GameUser.addGameUser(userID, gameID, existingGameUsers.length);
      console.log(`User '${req.session.user}' (${(userID !== 1) ? "" : "not "}signed in) connected to gameID ${gameID}.`);

      const maxPlayerCount = gameInfo.max_player_count;
      const playerCount = existingGameUsers.length + 1;

      req.session.gameID = gameID;

      if (maxPlayerCount === playerCount) { // Table is full
        res.redirect(`/play/${gameID}`);
      } else { // Waiting for other players
        res.status(204).send();
      }
    } else {
      res.status(204).send();
    }
  } else {
    res.redirect("/account");
  }
}

export { getRoot, postRoot };
