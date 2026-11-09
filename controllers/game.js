class Player {
  constructor(ws, uuid, name) {
    this.ws = ws;
    this.uuid = uuid;
    this.name = name;
    this.selectionCards = [];
    this.selectionIndices = []; // For animations
  }
}

class Deck {
  constructor(scene) {
    this.scene = scene;
    this.cards = Deck.types.map(type => new Card(this.scene, type));
  }

  static types = [
    "1c", "2c", "3c", "4c", "5c", "6c", "7c", "8c", "9c", "10c", "jc", "qc", "kc",
    "1d", "2d", "3d", "4d", "5d", "6d", "7d", "8d", "9d", "10d", "jd", "qd", "kd",
    "1h", "2h", "3h", "4h", "5h", "6h", "7h", "8h", "9h", "10h", "jh", "qh", "kh",
    "1s", "2s", "3s", "4s", "5s", "6s", "7s", "8s", "9s", "10s", "js", "qs", "ks",
  ];

  shuffle() {
    const deckLength = this.cards.length;
    for (let i=0; i<deckLength; ++i) {
      const j = Math.floor(Math.random() * deckLength)
      const card = this.cards[i];
      const otherCard = this.cards[j];

      this.cards.splice(i, 1, otherCard);
      this.cards.splice(j, 1, card);
    }
  }
}

class GameLogic {
  constructor(id) {
    // TODO: The deck needs to be moved serverside.
    this.id = id;
    this.players = [];
    this.state = "idle";

    GameLogic.games[id] = this;
  }

  static games = {};

  addPlayer(ws, name) {
    if (this.players.map(player => player.ws).includes(ws)) return false;
    else {
      const player = new Player(ws, crypto.randomUUID(), name);
      this.players.push(player);
      return player;
    }
  }

  removePlayer(ws) {
    if (this.players.map(player => player.ws).includes(ws)) {
      this.players.splice(this.players.map(player => player.ws).indexOf(ws), 1);
      return true;
    } else return false;
  }

  getPlayer(ws) {
    const player = this.players.find(player => player.ws === ws);
    return (player) ? player : false;
  }

  static getGameFromPlayer(ws) {
    for (const gameID in GameLogic.games) {
      let game = GameLogic.games[gameID];
      if (game.getPlayer(ws)) return game;
    }
    return false;
  }

  delete() {
    delete GameLogic.games[this.id];
  }
}

export default GameLogic;
