import Game from "./game.js";

// TODO:
//  - Fix animation issues. These include:
//    > Sorting cards after selection removes upstick animation.
//    > Cards can still have upstick after they have been sent to next player.
//    > When hovering at bottom of card, it jitters.
//  - Fix any issues with reloading the page whilst still in a game.

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
  let uuid = null;
  let connected = false;

  sendCardsBtn.addEventListener("click", evt => {
    const selection = game.getCardSelection();
    if (selection.length === 3 && game.state === "start") {
      game.setState("idle");

      const cardTypes = selection.map(card => card.type).join(" ");
      let cardIndices = game.players.find(player => player.mainPlayer).cards.map((card, inx) => (cardTypes.includes(card.type)) ? inx : -1).filter(val => val !== -1).join(" ");
      websocket.send(`selection ${cardTypes} ${cardIndices}`);
    }
  });

  sortCardsBtn.addEventListener("click", evt => {
    game.sortMainPlayerCards();
  });

  websocket.addEventListener("open", () => {
    connected = true;
    websocket.send("play");
    console.log("Connected to server.");
    websocket.send(`game ${canvas.dataset.gameid} ${name}`);
    game.addPlayer("back", true, null, name);

    websocket.addEventListener("message", evt => {
      let otherPlayerUUID, otherPlayerName, animationJSON, cardInx, animationID;
      const [command, ...args] = evt.data.split(" ");

      // console.log(command, args);
      switch (command) {
        case "connected":
          break;
        case "player-uuid":
          uuid = args[0];
          game.setMainPlayerUUID(uuid);
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
          const cardTypes = args.slice(0, 3);
          const cardIndices = args.slice(3).map(num => parseInt(num));
          game.passCardSelection(cardTypes, cardIndices);
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
          animationJSON = args[0];
          otherPlayerUUID = args[1];
          cardInx = args[2];

          game.setCardAnimation(JSON.parse(animationJSON), otherPlayerUUID, cardInx);
          break;
        case "card-animation-reverse":
          animationID = parseInt(args[0]);

          game.reverseCardAnimation(animationID);
      }
    });
  });

  function sendCardAnimation(animation, card, reverse=false) {
    if (["up", "upstick"].includes(animation.type) && card.player) {
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
