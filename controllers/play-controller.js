import GameLogic from "./game.js";
import Game from "./../models/game.js";

async function get(req, res) {
  const gameID = req.params.gameID;
  const name = req.session.user;
  const userID = req.session.userID;
  let uuid = req.cookies.uuid;

  req.session.gameID = gameID;

  // TODO: If game is full (check database), redirect player elsewhere.


  if (uuid.length) {
    GameLogic.games[gameID].getPlayer(uuid).online = true;
  } else if (gameID && name) {
    uuid = crypto.randomUUID();
    res.cookie("uuid", uuid);

    const game = GameLogic.games[gameID] || new GameLogic(gameID);
    const gameInfo = await Game.getGameInfoByID(gameID);
    const maxPlayerCount = gameInfo.max_player_count;

    if (gameInfo && game.players.length < maxPlayerCount) {
      const newPlayer = game.addPlayer(uuid, name, null);
      // TODO: Add player to database.
    }
  }

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
      case "refresh":
        game = GameLogic.getGameFromPlayer(ws);
        
        if (game) {
          const player = game.getPlayer(ws);

          player.selectionCards = [];
          player.selectionIndices = [];
          game.clearPlayerPastAnimations(player);

          for (const otherPlayer of game.players) {
            if (otherPlayer !== player) {
              otherPlayer.ws.send(`player-leave ${player.uuid}`);
            }
          }
        }
        // Then carry on to game
      case "game":
        const gameID = parseInt(args[0]);
        const name = args[1];
        const uuid = args[2];

        if (gameID && name && uuid) {
          game = GameLogic.games[gameID];
          const gameInfo = await Game.getGameInfoByID(gameID);
          const newPlayer = game.getPlayer(uuid);

          if (newPlayer && gameInfo && game) {
            const playerReload = Boolean(newPlayer.ws); // Whether the player has reloaded the page or pressed refresh button.
            newPlayer.ws = ws;
            
            if (!playerReload) {
              newPlayer.index = game.newestPlayerIndex;
              game.newestPlayerIndex++;
            }

            const playerBefores = [];
            for (const otherPlayer of game.players.sort((a, b) => a.index - b.index)) {
              if (otherPlayer.ws && otherPlayer !== newPlayer) {
                // Send newPlayer.ws player order information
                if (otherPlayer.index < newPlayer.index) playerBefores.push(otherPlayer); // These need to be sent in reverse order (player-before adds player to start, so first needs to be sent last).
                else ws.send(`player-after ${otherPlayer.uuid} ${otherPlayer.name}`);

                // If newPlayer is new (not a reload) send otherPlayer.ws player order information
                if (!playerReload) otherPlayer.ws.send(`player-after ${newPlayer.uuid} ${newPlayer.name}`);
              }
            }

            playerBefores.reverse();
            for (const otherPlayer of playerBefores) {
                ws.send(`player-before ${otherPlayer.uuid} ${otherPlayer.name}`);
            }

            const maxPlayerCount = gameInfo.max_player_count;
            if (!game.dealt && maxPlayerCount === game.players.filter(player => player.ws).length) {
              const cards = game.deck.cards.slice();
              for (const player of game.players) {
                setTimeout(() => {
                  player.cards = cards.filter((card, inx) => inx % maxPlayerCount === player.index);;
                  player.ws.send(`deal ${player.cards.join(" ")}`);
                  player.ws.send("start");
                  game.setState("start");
                }, 500);
              }

              game.deck.empty();
              game.dealt = true;
            } else if (["start", "main"].includes(game.state)) {
              // Player already in running game, so send them the correct details to get back into the game.
              const numsOfCards = game.players.map(player => player.cards.length);

              ws.send(game.state);
              ws.send(`cards ${game.players.length} ${numsOfCards.join(" ")} ${newPlayer.cards.join(" ")}`);
              for (const player of game.players) {
                if (player.discard.length) {
                  ws.send(`discard ${player.uuid} ${player.discard.join(" ")}`);
                }
              }

              if (game.state === "main") newPlayer.ws.send(`turn ${game.getTurnPlayer().uuid}`);
            }

            ws.send(`animation-backlog ${JSON.stringify(game.pastAnimations)}`);
          }
        }
        break;
      case "selection":
        game = GameLogic.getGameFromPlayer(ws);
        if (game) {
          game.getPlayer(ws).selectionCards = args.slice(0, 3);
          game.getPlayer(ws).selectionIndices = args.slice(3, 6).map(val => parseInt(val));

          if (game.state === "start" && game.players.every(player => player.selectionCards.length === 3)) {
            const allSelectionIndices = [];
            for (const player of game.players) {
              allSelectionIndices.push(...player.selectionIndices);
            }

            let i = 0;
            for (const player of game.players) {
              let previousPlayerIndex = player.index - 1;
              if (previousPlayerIndex < 0) previousPlayerIndex += game.players.length;
              const previousPlayer = game.players.find(p => p.index === previousPlayerIndex);

              // Change who has what cards serverside
              let cardToChangeToInx = 0;
              for (let j = 0; j<player.cards.length; ++j) {
                if (player.selectionCards.includes(player.cards[j])) {

                  player.cards.splice(j, 1, previousPlayer.selectionCards[cardToChangeToInx]);
                  cardToChangeToInx++;
                }
              }

              // Map other player indices with indexMapper
              const currentAllSelectionIndices = allSelectionIndices.map((num, inx) => {
                if (inx < i * 3 || inx >= (i + 1) * 3) {
                  return game.indexMapper[num] % game.getPlayer(ws).cards.length; // Not current player indices, so send the mapped ones.
                } else {
                  return num; // Indices for current player, so send the actual indices.
                }
              });

              // Change who has what cards clientside
              player.ws.send(`pass-cards ${previousPlayer.selectionCards.join(' ')} ${currentAllSelectionIndices.join(' ')}`);
              player.ws.send("main");
              player.ws.send(`turn ${game.getTurnPlayer().uuid}`);

              ++i;
            }

            game.setState("main"); // Also sets pastAnimations to [].
            game.nextTurn(0);
          }
        }
        break;
      case "card-animation":
        game = GameLogic.getGameFromPlayer(ws);
        if (game) {
          const animationJSON = args[0];
          const playerUUID = args[1];
          const cardInx = game.indexMapper[args[2]] % game.getPlayer(ws).cards.length;

          game.pastAnimations.push([animationJSON, playerUUID, cardInx]);

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
          const animationID = parseInt(args[0]);
          const player = game.getPlayer(ws);
          for (const otherPlayer of game.players) {
            if (otherPlayer !== player) {
              otherPlayer.ws.send(`card-animation-reverse ${animationID}`);
            }
          }
        }
        break;
      case "card-animation-remove":
        game = GameLogic.getGameFromPlayer(ws);
        if (game) {
          const animationID = parseInt(args[0]);
          const player = game.getPlayer(ws);
          game.removePastAnimation(animationID);
          for (const otherPlayer of game.players) {
            if (otherPlayer !== player) {
              otherPlayer.ws.send(`card-animation-remove ${animationID}`);
            }
          }
        }
        break;
      case "main":
        // TODO: Main game logic
        game = GameLogic.getGameFromPlayer(ws);

        if (game) {
          const player = game.getPlayer(ws);
          const cardType = args[0];
          const cardInx = args[1];
          
          if (player.turn && player.cards.includes(cardType)) {
            game.nextTurn();
            player.cards.splice(player.cards.indexOf(cardType), 1);
            player.discard.push(cardType);
            for (const otherPlayer of game.players) {
              if (otherPlayer === player) {
                ws.send(`play-card ${player.uuid} ${cardType} ${cardInx}`);
              } else {
                otherPlayer.ws.send(`play-card ${player.uuid} ${cardType} ${game.indexMapper[cardInx] % player.cards.length}`);
              }
              otherPlayer.ws.send(`turn ${game.getTurnPlayer().uuid}`);
            }
          }
        }
        break;
    }
  });

  ws.on("close", () => {
    const game = GameLogic.getGameFromPlayer(ws);
    if (game) {
      const player = game.getPlayer(ws);

      player.selectionCards = [];
      player.selectionIndices = [];
      game.clearPlayerPastAnimations(player);

      for (const otherPlayer of game.players) {
        if (otherPlayer !== player) {
          otherPlayer.ws.send(`player-leave ${player.uuid}`);
        }
      }
    }

  });

}

export {get, handleGame};
