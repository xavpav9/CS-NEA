const websocket = new WebSocket("ws://127.0.0.1:8080/"); // localhost

websocket.addEventListener("open", () => {
  console.log("Connected to server.");

  websocket.send("Hello server");
});
