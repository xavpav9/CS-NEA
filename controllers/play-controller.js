import GameLogic from "./game.js";
import Game from "./../models/game.js";

//TODO:
//  - Use player.cards to keep track of who has what cards, instead of relying on the client.


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
    let game;
    const message = data.toString();
    const [command, ...args] = message.split(" ");

    // console.log(command, args);
    switch (command) {
      case "game":
        const gameID = parseInt(args[0]);
        const name = args[1];

        if (gameID && name) {
          game = GameLogic.games[gameID] || new GameLogic(gameID);
          const gameInfo = await Game.getGameInfoByID(gameID);
          const maxPlayerCount = gameInfo.max_player_count;

          if (gameInfo && !game.getPlayer(ws) && game.players.length < maxPlayerCount) {
            const newPlayer = game.addPlayer(ws, name);

            ws.send(`player-uuid ${newPlayer.uuid}`);
            for (const otherPlayer of game.players) {
              if (otherPlayer !== newPlayer) {
                ws.send(`player-before ${otherPlayer.uuid} ${otherPlayer.name}`);
                otherPlayer.ws.send(`player-after ${newPlayer.uuid} ${newPlayer.name}`);
              }
            }

            if (maxPlayerCount === game.players.length) {
              let playerIndex = 0;
              const cards = game.deck.cards.slice();
              for (const player of game.players) {
                player.index = playerIndex;
                setTimeout(() => {
                  player.cards = cards.filter((card, inx) => inx % maxPlayerCount === player.index);;
                  player.ws.send(`deal ${player.cards.join(" ")}`);
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
        game = GameLogic.getGameFromPlayer(ws);
        if (game) {
          game.getPlayer(ws).selectionCards = args.slice(0, 3);
          game.getPlayer(ws).selectionIndices = args.slice(3, 6);

          if (game.state === "start" && game.players.every(player => player.selectionCards.length === 3)) {
            const allSelectionIndices = [];
            for (const player of game.players) {
              allSelectionIndices.push(...player.selectionIndices);
            }

            let i = 0;
            for (const player of game.players) {
              let previousPlayerIndex = player.index - 1;
              if (previousPlayerIndex < 0) previousPlayerIndex += game.players.length;

              const currentAllSelectionIndices = allSelectionIndices.map((num, inx) => {
                if (inx < i * 3 || inx >= (i + 1) * 3) {
                  return game.indexMapper[num] % game.getPlayer(ws).cards.length; // Not current player indices, so send the mapped ones.
                } else {
                  return num; // Indices for current player, so send the actual indices.
                }
              });

              player.ws.send(`pass-cards ${game.players.find(otherPlayer => otherPlayer.index === previousPlayerIndex).selectionCards.join(' ')} ${currentAllSelectionIndices.join(' ')}`);
              player.ws.send("main");

              ++i;
            }

            game.state = "main";
          }
        }
        break;
      case "card-animation":
        game = GameLogic.getGameFromPlayer(ws);
        if (game) {
          const animationJSON = args[0];
          const playerUUID = args[1];
          const cardInx = game.indexMapper[args[2]] % game.getPlayer(ws).cards.length;

          for (const otherPlayer of game.players) {
            if (otherPlayer.ws !== ws) {
              otherPlayer.ws.send(`card-animation ${animationJSON} ${playerUUID} ${cardInx}`);
            }
          }
        }
        break;
      case "card-animation-reverse":
        game = GameLogic.getGameFromPlayer(ws);
        if (game) {
          const animationID = args[0];
          for (const otherPlayer of game.players) {
            if (otherPlayer.ws !== ws) {
              otherPlayer.ws.send(`card-animation-reverse ${animationID}`);
            }
          }
        }
        break;
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
