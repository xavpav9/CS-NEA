const websocket = new WebSocket("ws://127.0.0.1:8080/"); // localhost


const WebsocketHandler = (function() {
  const form = document.querySelector("#join-form");
  const gameIDInput = document.querySelector("#game-id");
  let connected = false;

  websocket.addEventListener("open", () => {
    connected = true;
    websocket.send("join");
    console.log("Connected to server.");
  });

  websocket.addEventListener("message", evt => {
    const [command, argument] = evt.data.split(" ");
    console.log(command, argument);
    switch (command) {
      case "connected":
        break;
      case "play":
        gameIDInput.value = argument;
        form.submit();
        break;
      case "join": //TODO
        // UI to show table join (current player)
        break;
      case "otherjoin":
        // UI to show table join (other player)
        break;
      case "remove":
        // UI to show table leave (current player)
        break;
      case "otherremove":
        // UI to show table leave (other player)
        break;
    }
  });

  function joinGame(gameID) {
    if (connected) {
      websocket.send(gameID);
    }
  }

  return {
    joinGame,
  };
})();

const JoinManager = (function() {
  const joinBtns = document.querySelectorAll(".join-btn");
  const form = document.querySelector("#join-form");

  form.addEventListener("submit", evt => {
    if (evt.isTrusted) evt.preventDefault();
  });

  joinBtns.forEach(joinBtn => {
    joinBtn.addEventListener("click", evt => {
      WebsocketHandler.joinGame(joinBtn.dataset.gameid);
    });
  });

  return {};
})();
