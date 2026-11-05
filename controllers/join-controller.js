import Table from "./table.js";
import User from "./../models/user.js";
import GameUser from "./../models/game-user.js";
import Game from "./../models/game.js";

const TABLE_SIZE = 4;

function getRoot(req, res) {
  const user = req.session.user;
  const gameID = req.params["gameID"];

  if (user) res.render("join", {
    gameIDs: [123480, 321470234, 412023],
  });
  else res.redirect("/account");
}

async function postRoot(req, res) {
  const gameID = parseInt(req.body.gameID);
  const table = Table.tables[gameID];

  //WARN: Possible security issue:
  //Cannot match websocket to a client post request.
  //So, anybody could send a post request for a gameID at the exact correct time (before other correct users have sent theirs) and join a game they are not supposed to be in.

  if (gameID && req.session.user && table && table.ready) {
    const userID = parseInt((req.session.userID) ? req.session.userID : 1);
    let gameInfo = await Game.getGameInfoByID(gameID);

    if (!gameInfo) { // Game with this ID does not exist yet
      await Game.addGame(gameID, TABLE_SIZE, 0);
      gameInfo = await Game.getGameInfoByID(gameID);
    }

    const existingGameUsers = await GameUser.getGameUsersInfoByGameID(gameID);

    await GameUser.addGameUser(userID, gameID, existingGameUsers.length);
    console.log(`User '${req.session.user}' (${(userID !== 1) ? "" : "not "}signed in) connected to gameID ${gameID}.`);

    req.session.gameID = gameID;
    res.redirect(`/play/${gameID}`);

    if (existingGameUsers.length + 1 === TABLE_SIZE) table.delete(); // Table is full.
  } else {
    res.redirect("/account");
  }
}

const websockets = [];

function handleJoin(ws) {
  ws.send("connected");
  websockets.push(ws);

  // TODO: Client needs to send their name (and avatar) since websocket cannot access sessions.

  ws.on("message", data => {
    const message = data.toString();
    const gameID = parseInt(message);
    let table = Table.tables[gameID] || new Table(gameID);

    if (gameID) {
      table.addPlayer(ws);

      for (const otherTable of Object.values(Table.tables)) {
        if (otherTable !== table) {
          if (otherTable.removePlayer(ws)) {
            ws.send(`remove ${gameID}`);
            for (const otherWs of websockets) {
              if (otherWs !== ws) otherWs.send(`otherremove ${gameID}`); // TODO
            }
            break;
          }
        }
      }

      if (table.players.length === TABLE_SIZE) {
        table.ready = true;

        for (const otherWs of table.players) {
          otherWs.send(`play ${gameID}`);
        }

        for (const otherWs of websockets) {
          otherWs.send(`delete ${gameID}`);
        }
      } else {
        ws.send(`join ${gameID}`);
        for (const otherWs of websockets) {
          if (otherWs !== ws) otherWs.send(`otherjoin ${gameID}`); // TODO
        }
      }
    }
  });

  ws.on("close", () => {
    for (const table of Object.values(Table.tables)) {
      if (table.removePlayer(ws)) {
        for (const otherWs of websockets) {
          if (otherWs !== ws) otherWs.send(`otherremove ${gameID}`); // TODO
        }
        break;
      }
    }

    websockets.splice(websockets.indexOf(ws), 1);
  });
}

export { getRoot, postRoot, handleJoin };
