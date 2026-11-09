import Table from "./table.js";
import GameLogic from "./game.js";
import User from "./../models/user.js";
import GameUser from "./../models/game-user.js";
import Game from "./../models/game.js";

const TABLE_SIZE = 1;
const MAX_GAME_ID = 1_000_000_000_000;
for (let i=0; i<3; ++i) new Table(generateGameID());

function getRoot(req, res) {
  const user = req.session.user;
  const gameID = req.params["gameID"];
  const gameIDs = {};

  for (const tableID in Table.tables) {
    gameIDs[tableID] = Table.getPlayers(tableID);
  }

  if (user) res.render("join", {
    gameIDs,
    index: 0,
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

function generateGameID() {
  let gameID;
  const currentGameIDs = Object.keys(Table.tables).concat(Object.keys(GameLogic.games)).map(num => parseInt(num)); // TODO: Get this information from the database when fully set up (for past games).
  do {
   gameID = Math.floor(Math.random() * MAX_GAME_ID);
  } while (currentGameIDs.includes(gameID));

  return gameID;
}

const websockets = [];

function handleJoin(ws) {
  ws.send("connected");
  websockets.push(ws);

  ws.on("message", data => {
    const message = data.toString();
    const [command, ...args] = message.split(" ");

    switch (command) {
      case "table":
        const gameID = parseInt(args[0]);
        const name = args[1];
        const table = Table.tables[gameID] || new Table(gameID);

        if (gameID && name && !table.getPlayer(ws)) {
          const newPlayer = table.addPlayer(ws, name);

          for (const otherTable of Object.values(Table.tables)) {
            if (otherTable !== table) {
              const player = otherTable.getPlayer(ws);
              if (otherTable.removePlayer(ws)) {
                ws.send(`remove ${otherTable.id}`);
                for (const otherWs of websockets) {
                  if (otherWs !== ws) otherWs.send(`otherremove ${otherTable.id} ${player.uuid}`);
                }
                break;
              }
            }
          }

          if (table.players.length === TABLE_SIZE) {
            table.ready = true;

            const newTable = new Table(generateGameID());

            for (const player of table.players) {
              player.ws.send(`play ${gameID}`);
            }

            for (const otherWs of websockets) {
              otherWs.send(`delete ${gameID}`);
              otherWs.send(`new ${newTable.id}`);
            }
          } else {
            ws.send(`join ${gameID} ${newPlayer.uuid}`);
            for (const otherWs of websockets) {
              if (otherWs !== ws) otherWs.send(`otherjoin ${gameID} ${newPlayer.uuid} ${newPlayer.name}`);
            }
          }
        }
        break;
    }
  });

  ws.on("close", () => {
    for (const table of Object.values(Table.tables)) {
      const player = table.getPlayer(ws);
      if (table.removePlayer(ws)) {
        for (const otherWs of websockets) {
          if (otherWs !== ws) otherWs.send(`otherremove ${table.id} ${player.uuid}`);
        }
        break;
      }
    }

    websockets.splice(websockets.indexOf(ws), 1);
  });
}

export { getRoot, postRoot, handleJoin };
