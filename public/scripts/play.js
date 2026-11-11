import Game from "./game.js";

// TODO:
//  - Send animations so that other players can see them.

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
    game.addPlayer("back", true);

    websocket.addEventListener("message", evt => {
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
        case "passcards":
          // args = 3 cards being passed to player, then all the player indices for animation
          const cardTypes = args.slice(0, 3);
          const cardIndices = args.slice(3).map(num => parseInt(num));
          game.passCardSelection(cardTypes, cardIndices);
          break;
        case "playerbefore":
          game.addPlayer("front", false);
          break;
        case "playerafter":
          game.addPlayer("back", false);
          break;
      }
    });
  });

  return {};
})();
