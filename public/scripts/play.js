import Game from "./game.js";

// TODO:
//  - Setup the card model textures when receiving the "selection" command (currently, cards are blank). 
//  - Add sort cards button.
//  - Send animations so that other players can see them.

const canvas = document.querySelector("#c");
const game = new Game(canvas, 4);

const websocket = new WebSocket("ws://127.0.0.1:8080/play"); // localhost

const DomHandler = (function() {
  const sendCardsBtn = document.querySelector("#send-cards");
  sendCardsBtn.style.display = "none";

  return {};
})();

const WebsocketHandler = (function() {
  const sendCardsBtn = document.querySelector("#send-cards");
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
          game.setMainPlayerCards(args);
          const interval = setInterval(() => {
            if (game.pickupPile.cards.every(card => card.model.ready)) {
              game.deal(); // Load models
              clearInterval(interval);
            }
          }, 500);
          break;
        case "start":
          sendCardsBtn.style.display = "inline-block";
          game.setState("start");
          break;
        case "main":
          game.setState("main");
          break;
        case "idle":
          game.setState("idle");
          break;
        case "passcards":
          const cardTypes = args.slice(0, args.length/2);
          const cardIndices = args.slice(args.length/2).map(num => parseInt(num));
          game.passCards(cardTypes, cardIndices);
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
