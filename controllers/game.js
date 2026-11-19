class Player {
  constructor(uuid, ws, name) {
    this.ws = ws;
    this.uuid = uuid;
    this.name = name;
    this.index = null; // Index in game order
    this.selectionCards = [];
    this.selectionIndices = []; // For animations
    this.cards = []; // The card types
    this.online = true; // If the player disconnects
    this.turn = false;
  }
}

class Deck {
  constructor() {
    this.cards = Deck.types.slice();
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

  empty() {
    this.cards = [];
  }
}

class GameLogic {
  constructor(id) {
    this.id = id;
    this.players = [];
    this.state = "idle";
    this.deck = new Deck();
    this.deck.shuffle();
    this.dealt = false;
    this.indexMapper = {}; // Maps card indices to distinct other ones to prevent cheating
    this.pastAnimations = []; // (playercard) Animations that have already happened (Animation backlog)
    this.newestPlayerIndex = 0; // Index of player being added next
    this.turn = 0;

    const values = [];
    for (let i=0; i<52; ++i) values.push(i);
    for (let i=0; i<52; ++i) this.indexMapper[i] = values.splice(Math.floor(Math.random() * values.length), 1)[0];

    GameLogic.games[id] = this;
  }

  static games = {};

  addPlayer(uuid, name, ws=null) {
    if (this.players.map(player => player.uuid).includes(uuid)) return false;
    else {
      const player = new Player(uuid, ws, name);
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

  getPlayer(identification) {
    const player = this.players.find(player => player.ws === identification || player.uuid === identification);
    return (player) ? player : false;
  }

  clearPlayerPastAnimations(player) {
    const animationIDs = [];
    for (let i=0; i<this.pastAnimations.length;) {
      const animation = this.pastAnimations[i];
      if (animation[0] === "normal") {
        if (animation[2] === player.uuid) {
          const animationObj = JSON.parse(animation[1]);
          if (animationObj !== null) animationIDs.push(parseInt(animationObj.id));
          this.pastAnimations.splice(i, 1);
        } else i++;
      } else {
        if (animationIDs.includes(parseInt(animation[1]))) {
          this.pastAnimations.splice(i, 1);
        } else i++;
      }
    }

  }

  static getGameFromPlayer(identification) {
    for (const gameID in GameLogic.games) {
      let game = GameLogic.games[gameID];
      if (game.getPlayer(identification)) return game;
    }
    return false;
  }

  setState(state) {
    this.pastAnimations = [];
    this.state = state;
  }

  nextTurn(turn=-1) {
    this.turn = (turn === -1) ? (this.turn + 1) % this.players.length : turn;
    this.players.forEach((player, inx) => {
      player.turn = (this.turn === inx);
    });
  }

  delete() {
    delete GameLogic.games[this.id];
  }
}

export default GameLogic;
