import Game from "./game.js";
import {rp} from "./ui.js";
import {Card} from "./objects.js";

// TODO:
//  - Fix animation issue - When hovering at bottom of card, it jitters.
//  - If there is a render issue, allow the user to reset the canvas.

const canvas = document.querySelector("#c");
const game = new Game(canvas, 4);

const websocket = new WebSocket("ws://127.0.0.1:8080/play"); // localhost

const DomHandler = (function() {
  const sendCardsBtn = document.querySelector("#send-cards");
  const sortCardsBtn = document.querySelector("#sort-cards");
  hideSendCardsBtn();

  function hideSendCardsBtn() {
    sendCardsBtn.style.display = "none";
  }

  function showSendCardsBtn() {
    sendCardsBtn.style.display = "inline-block";
  }

  return {
    hideSendCardsBtn,
    showSendCardsBtn,
  };
})();

const WebsocketHandler = (function() {
  const sendCardsBtn = document.querySelector("#send-cards");
  const sortCardsBtn = document.querySelector("#sort-cards");
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
      let otherPlayerUUID, otherPlayerName, animationObj, cardInx, animationID, cardTypes;
      const [command, ...args] = evt.data.split(" ");

      console.log(command, args);
      switch (command) {
        case "connected":
          break;
        case "deal":
          // args = cards dealt to player
          game.setMainPlayerCards(args);
          const interval = setInterval(() => {
            if (game.pickupPile.cards.every(card => card.model.ready)) {
              game.deal(); // Load models
              clearInterval(interval);
            }
          }, 500);
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
          const cardIndices = args.slice(3).map(num => parseInt(num));
          game.passCardSelection(cardTypes, cardIndices);
          setTimeout(() => game.getMainPlayer().passingSelection = false, rp.PASSCARD_ANIMATION_TIME);
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
        case "card-animation":
          animationObj = JSON.parse(args.slice(0, -2).join(" "));
          otherPlayerUUID = args[1];
          cardInx = parseInt(args[2]);

          if (game.dealt) {
            game.setCardAnimation(animationObj, otherPlayerUUID, cardInx);
          } else {
            game.animationBacklog.push(["normal", animationObj, otherPlayerUUID, cardInx]);
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
        case "animation-backlog":
          game.animationBacklog = JSON.parse(args.slice().join(" "));
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
          const mainPlayer = game.getMainPlayer();
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

          // TODO: Fix code below to sort out animation backlog.
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

  function sendCardAnimation(animation, card, reverse=false) {
    if (animation === null) {
        websocket.send(`card-animation ${JSON.stringify(null)} ${card.player.uuid} ${card.player.cards.indexOf(card)}`);
    } else if (["up", "upstick"].includes(animation.type) && card.player) {
      if (reverse) {
        websocket.send(`card-animation-reverse ${animation.id}`);
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
