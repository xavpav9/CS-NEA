const websocket = new WebSocket("ws://127.0.0.1:8080/"); // localhost

const DomHandler = (function() {
  const form = document.querySelector("#join-form");
  function addPlayer(gameID, uuid, name, mainPlayer) {
    const table = [...form.children].find(child => parseInt(child.dataset.gameid) === gameID);
    const div = document.createElement("div");
    div.dataset.uuid = uuid;
    div.textContent = name;

    div.classList.add("player");
    if (mainPlayer) div.classList.add("main-player");


    table.appendChild(div);
  }

  function removePlayer(gameID, uuid) {
    const players = [...document.querySelectorAll(".player")];
    const player = players.find(player => player.dataset.uuid === uuid);
    if (player) player.remove();
  }

  function deleteTable(gameID) {
    const tables = [...document.querySelectorAll(".table")];
    const table = tables.find(table => table.dataset.gameid);
    if (table) {
      table.remove();
      let index = 0;
      for (const otherTable of document.querySelectorAll(".table")) {
        otherTable.querySelector(".join-btn").textContent = `Join table ${++index}`;
      }

      if (index === 0) {
        const para = document.createElement("p");
        para.textContent = "No tables";
        form.appendChild(para);
      }
    }
  }

  return {
    addPlayer,
    removePlayer,
    deleteTable,
  };
})();

const WebsocketHandler = (function() {
  const form = document.querySelector("#join-form");
  const gameIDInput = document.querySelector("#game-id");
  let connected = false;

  let name = document.cookie.split(";").map(cookie => cookie.trim().split("=")).find(keyVal => keyVal[0] === "user")[1];
  let uuid = null;

  websocket.addEventListener("open", () => {
    connected = true;
    websocket.send("join");
    console.log("Connected to server.");
  });

  websocket.addEventListener("message", evt => {
    let gameID, otherPlayerUUID, otherPlayerName;

    const [command, ...args] = evt.data.split(" ");
    console.log(command, args);
    switch (command) {
      case "connected":
        break;
      case "play":
        gameIDInput.value = args[0];
        form.submit();
        break;
      case "join":
        // UI to show table join (current player)
        gameID = parseInt(args[0]);
        uuid = args[1];

        DomHandler.addPlayer(gameID, uuid, name, true);
        break;
      case "otherjoin":
        gameID = parseInt(args[0]);
        otherPlayerUUID = args[1];
        otherPlayerName = args[2];

        DomHandler.addPlayer(gameID, otherPlayerUUID, otherPlayerName, false);
        // UI to show table join (other player)
        break;
      case "remove":
        // UI to show table leave (current player)
        gameID = parseInt(args[0]);

        DomHandler.removePlayer(gameID, uuid);
        break;
      case "otherremove":
        // UI to show table leave (other player)
        gameID = parseInt(args[0]);
        otherPlayerUUID = args[1];

        DomHandler.removePlayer(gameID, otherPlayerUUID);
        break;
      case "delete":
        gameID = parseInt(args[0]);

        DomHandler.deleteTable(gameID);
        break;
    }
  });

  function joinGame(gameID) {
    if (connected) {
      websocket.send(`table ${gameID} ${name}`);
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
