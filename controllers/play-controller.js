import GameLogic from "./game.js";
import Game from "./../models/game.js";


function get(req, res) {
  const gameID = req.params.gameID;
  const username = req.session.user;
  const userID = req.session.userID;

  req.session.gameID = gameID;




  res.render("play", {
    gameID,
  });
}

function handleGame(ws) {
  ws.send("connected");

  ws.on("message", async data => {
    const message = data.toString();
    const [command, ...args] = message.split(" ");

    switch (command) {
      case "game":
        const gameID = parseInt(args[0]);
        const name = args[1];

        if (gameID && name) {
          const game = GameLogic.games[gameID] || new GameLogic(gameID);
          const gameInfo = await Game.getGameInfoByID(gameID);
          const maxPlayerCount = gameInfo.max_player_count;

          if (gameInfo && !game.getPlayer(ws) && game.players.length < maxPlayerCount) {
            const newPlayer = game.addPlayer(ws, name);

            for (const otherPlayer of game.players) {
              if (otherPlayer !== newPlayer) {
                ws.send(`playerbefore ${otherPlayer.uuid} ${otherPlayer.name}`);
                otherPlayer.ws.send(`playerafter ${newPlayer.uuid} ${newPlayer.name}`);
              }
            }

            if (maxPlayerCount === game.players.length) {
              let playerIndex = 0;
              const cards = game.deck.cards.slice();
              for (const player of game.players) {
                player.index = playerIndex;
                setTimeout(() => {
                  player.ws.send(`deal ${cards.filter((card, inx) => inx % maxPlayerCount === player.index).join(" ")}`);
                  player.ws.send("start");
                  game.state = "start";
                }, 500);
                playerIndex++;
              }

              game.deck.empty();
            }
          }
        }
        break;
      case "selection":
        const game = GameLogic.getGameFromPlayer(ws);
        if (game) {
          game.getPlayer(ws).selectionCards = args.slice(0, 3);
          game.getPlayer(ws).selectionIndices = args.slice(3, 6);

          if (game.state === "start" && game.players.every(player => player.selectionCards.length === 3)) {
            const allSelectionIndices = [];
            for (const player of game.players) {
              allSelectionIndices.push(...player.selectionIndices);
            }

            for (const player of game.players) {
              let previousPlayerIndex = player.index - 1;
              if (previousPlayerIndex < 0) previousPlayerIndex += game.players.length;

              player.ws.send(`passcards ${game.players.find(otherPlayer => otherPlayer.index === previousPlayerIndex).selectionCards.join(' ')} ${allSelectionIndices.join(' ')}`);
              player.ws.send("main");
            }

            game.state = "main";
          }
        }
      case "main":
        // TODO: Main game logic
        break;
    }
  });

  ws.on("close", () => {
    // Handle close properly
  });

}

export {get, handleGame};
