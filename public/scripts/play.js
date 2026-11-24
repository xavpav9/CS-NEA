import Game from "./game.js";
import {rp} from "./ui.js";
import {Card} from "./objects.js";

// TODO:
//  - When hovering at bottom of card, it jitters.
//  - If there is a render issue, allow the user to reset the canvas.
//  - If a player selects then reloads while another is still loading, the animations break.
//  - Functionality for reloading in main game state and on join page.
//  - Sometimes, a card is not loaded properly (rendered at the origin, but not in anyone's hand) and causes the game to break.
//  - FIX ALL ANIMATION INCONSISTENCIES ACROSS CLIENTS.

const canvas = document.querySelector("#c");
const game = new Game(canvas, 4);

const websocket = new WebSocket("ws://127.0.0.1:8080/play"); // localhost

const DomHandler = (function() {
  const sendCardsBtn = document.querySelector("#send-cards");
  const sortCardsBtn = document.querySelector("#sort-cards");
  const playCardBtn = document.querySelector("#play-card");
  hideSendCardsBtn();
  hidePlayCardBtn();

  function hideSendCardsBtn() {
    sendCardsBtn.style.display = "none";
  }
  
  function hidePlayCardBtn() {
    playCardBtn.style.display = "none";
  }

  function showSendCardsBtn() {
    sendCardsBtn.style.display = "inline-block";
  }

  return {
    hideSendCardsBtn,
    hidePlayCardBtn,
    showSendCardsBtn,
  };
})();

const WebsocketHandler = (function() {
  const sendCardsBtn = document.querySelector("#send-cards");
  const sortCardsBtn = document.querySelector("#sort-cards");
  const playCardBtn = document.querySelector("#play-card");
  let name = document.cookie.split(";").map(cookie => cookie.trim().split("=")).find(keyVal => keyVal[0] === "user")[1];
  let uuid = document.cookie.split(";").map(cookie => cookie.trim().split("=")).find(keyVal => keyVal[0] === "uuid")[1];
  let connected = false;

  sendCardsBtn.addEventListener("click", evt => {
    const selection = game.getCardSelection();
    const mainPlayer = game.getMainPlayer();
    if (selection.length === 3 && game.state === "start" && !mainPlayer.sorting && !mainPlayer.passingSelection) {
      game.setState("idle");

      const cardTypes = selection.map(card => card.type).join(" ");
      let cardIndices = mainPlayer.cards.map((card, inx) => (cardTypes.includes(card.type)) ? inx : -1).filter(val => val !== -1).join(" ");
      websocket.send(`selection ${cardTypes} ${cardIndices}`);
      mainPlayer.passingSelection = true;
    }
  });

  playCardBtn.addEventListener("click", evt => {
    const card = game.getSelectedCard();
    const mainPlayer = game.getMainPlayer();

    if (mainPlayer.turn && card.player) {
      const cardInx = card.player.cards.indexOf(card);
      mainPlayer.turn = false;
      websocket.send(`main ${card.type} ${cardInx}`)
    }
  });

  sortCardsBtn.addEventListener("click", evt => {
    game.sortMainPlayerCards();
  });

  websocket.addEventListener("open", () => {
    connected = true;
    websocket.send("play");
    console.log("Connected to server.");
    websocket.send(`game ${canvas.dataset.gameid} ${name} ${uuid}`);
    game.addPlayer("back", true, uuid, name);

    websocket.addEventListener("message", evt => {
      let otherPlayerUUID, otherPlayerName, animationJSON, cardInx, animationID, cardType, cardTypes, mainPlayer, cardIndices;
      const [command, ...args] = evt.data.split(" ");

      console.log(command, args);
      switch (command) {
        case "connected":
          break;
        case "deal":
          // args = cards dealt to player
          game.setMainPlayerCards(args);
          const dealCard = () => {
            if (game.pickupPile.cards.every(card => card.model.ready)) {
              setTimeout(() => game.deal(), 500); // Deal 500ms after models load
            } else {
              setTimeout(() => dealCard(), 50);
            }
          };
          dealCard();
          break;
        case "start":
          DomHandler.showSendCardsBtn();
          game.setState("start");
          break;
        case "main":
          game.setState("main");
          break;
        case "idle":
          game.setState("idle");
          break;
        case "pass-cards":
          // args = 3 cards being passed to player, then all the player card indices for animation
          cardTypes = args.slice(0, 3);
          cardIndices = args.slice(3).map(num => parseInt(num));
          
          game.clearAllAnimations();
          game.passCardSelection(cardTypes, cardIndices).then(() => {
            setTimeout(() => game.getMainPlayer().passingSelection = false, rp.PASSCARD_ANIMATION_TIME + 50);
          });
          break;
        case "player-before":
          otherPlayerUUID = args[0];
          otherPlayerName = args[1];
          game.addPlayer("front", false, otherPlayerUUID, otherPlayerName);
          break;
        case "player-after":
          otherPlayerUUID = args[0];
          otherPlayerName = args[1];
          game.addPlayer("back", false, otherPlayerUUID, otherPlayerName);
          break;
        case "turn":
          otherPlayerUUID = args[0];
          game.players.forEach((player, inx) => {
            player.turn = (otherPlayerUUID === player.uuid);
          });
          break;
        case "play-card":
          otherPlayerUUID = args[0];
          cardType = args[1];
          cardInx = parseInt(args[2]);

          mainPlayer = game.getMainPlayer();
          if (mainPlayer.uuid === otherPlayerUUID) {
            const card = mainPlayer.cards.find(card => card.type === cardType);

            mainPlayer.playCard(card);
          } else {
            const player = game.players.find(p => p.uuid === otherPlayerUUID);
            game.replacePlayerCard(player, cardType, cardInx);
            const card = player.cards[cardInx];

            // Incase play card is sent before card is repositioned by draw
            game.scene.setPlayerCardModel(card, player.cards.length, cardInx);
            card.model.updateWorldMatrix();

            for (const card of player.cards) {
              // When playing a card, it messes with the card sender's animation, so just clear animations.
              card.setAnimation(null, true, false);
            }

            player.playCard(player.cards[cardInx]);
          }
          break;
        case "card-animation":
          animationJSON = args.slice(0, -2).join(" ");
          otherPlayerUUID = args[1];
          cardInx = parseInt(args[2]);

          if (game.dealt) {
            game.setCardAnimation(JSON.parse(animationJSON), otherPlayerUUID, cardInx);
          } else {
            game.animationBacklog.push(["normal", animationJSON, otherPlayerUUID, cardInx]);
          }
          break;
        case "card-animation-reverse":
          animationID = parseInt(args[0]);

          if (game.dealt) {
            game.reverseCardAnimation(animationID);
          } else {
            game.animationBacklog.push(["reverse", animationID]);
          }
          break;
        case "card-animation-remove":
          animationID = parseInt(args[0]);

          if (game.dealt) {
            game.removeCardAnimation(animationID);
          } else {
            game.animationBacklog.push(["remove", animationID]);
          }
          break;
        case "animation-backlog":
          game.animationBacklog = JSON.parse(args.slice().join(" ")).map(arr => ["normal", ...arr]);
          break;
        case "player-leave":
          otherPlayerUUID = args[0];
          const otherPlayer = game.players.find(player => player.uuid === otherPlayerUUID);
          if (otherPlayer) {
            for (const card of otherPlayer.cards) {
              card.setAnimation(null, true, false);
            }
          }
          break;
        case "cards":
          const numOfPlayers = parseInt(args[0]);
          const playerCardCounts = args.slice(1, numOfPlayers+1);
          cardTypes = args.slice(numOfPlayers+1);

          game.deck.empty();
          game.dealt = true;

          // Set main player cards
          mainPlayer = game.getMainPlayer();
          if (mainPlayer) {
            for (const cardType of cardTypes) {
              game.addPlayerCard(mainPlayer, cardType);
            }
          }

          // Fill other player cards with blanks
          for (let i=0; i<numOfPlayers; ++i) {
            const player = game.players[i];
            if (player && !player.mainPlayer) {
              for (let j=0; j<playerCardCounts[i]; ++j) game.addPlayerCard(player, "blank");
            }
          }

          // Sort out animation backlog.
          const clearAnimationBacklogAfterReload = () => {
            if (mainPlayer.cards.every(card => card.model.ready)) {
              game.clearAnimationBacklog();
            } else {
              setTimeout(() => clearAnimationBacklogAfterReload(), 50);
            }
          };
          setTimeout(() => clearAnimationBacklogAfterReload(), 500);

          break;
      }
    });
  });

  function sendCardAnimation(animation, card, reverse=false, remove=false) {
    if (animation && ["up", "upstick"].includes(animation.type) && card.player) {
      if (reverse) {
        websocket.send(`card-animation-reverse ${animation.id}`);
      } else if (remove) {
        websocket.send(`card-animation-remove ${animation.id}`);
      } else {
        const animationJSON = JSON.stringify(animation);
        websocket.send(`card-animation ${animationJSON} ${card.player.uuid} ${card.player.cards.indexOf(card)}`);
      }
    }
  }

  return {
    sendCardAnimation,
  };
})();

export { WebsocketHandler };
