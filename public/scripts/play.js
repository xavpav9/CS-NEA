import Game from "./game.js";

const canvas = document.querySelector("#c");
const game = new Game(canvas, 4);

const websocket = new WebSocket("ws://127.0.0.1:8080/play"); // localhost

websocket.addEventListener("open", () => {
  websocket.send("play");

  websocket.addEventListener("message", message => {
    const data = message.data;
    console.log(data);
  });
});
