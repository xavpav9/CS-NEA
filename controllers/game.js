class Player {
  constructor(uuid, ws, name) {
    this.ws = ws;
    this.uuid = uuid;
    this.name = name;
    this.index = null; // Index in game order
    this.selectionCards = [];
    this.selectionIndices = []; // For animations
    this.cards = []; // The card types
    this.discard = []; // The discard card types (first index = bottom of pile)
    this.tricks = []; // The tricks won for a hand (up to 13)
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
    this.indexMappers = {}; // Each one maps card indices to distinct other ones to prevent cheating
    this.pastAnimations = []; // (playercard) Animations that have already happened (Animation backlog but not affect by reverse, and remove removes animations)
    this.newestPlayerIndex = 0; // Index of player being added next
    this.turn = 0; // Who has current turn
    this.startingTurn = 0; // Who started first

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
    for (let i=0; i<this.pastAnimations.length;) {
      const animation = this.pastAnimations[i];
      if (animation[1] === player.uuid) {
        const animationObj = JSON.parse(animation[0]);
        this.pastAnimations.splice(i, 1);
      } else i++;
    }
  }

  removePastAnimation(id) { // Remove animation if it has been removed or reversed.
    for (let i=0; i<this.pastAnimations.length; i++) {
      const animation = this.pastAnimations[i];
      const animationObj = JSON.parse(animation[0]);
      if (animationObj.id === id) {
        this.pastAnimations.splice(i, 1);
        break;
      }
    }
  }

  isCardBigger(card1, card2) {
    const priorityNum = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "j", "q", "k", "1"];

    let card1Number = parseInt(priorityNum.indexOf(card1.slice(0, -1))) + 1;
    let card2Number = parseInt(priorityNum.indexOf(card2.slice(0, -1))) + 1;

    const card1Suit = card1.at(-1);
    const card2Suit = card2.at(-1);

    return card1Suit === card2Suit && card1Number > card2Number;
  }

  getTrickWinner() {
    let trickWinner = this.players[this.startingTurn];
    let trickWinnerCard = trickWinner.discard.at(-1);

    if (trickWinnerCard) {
      for (let i=(this.startingTurn+1)%this.players.length; i!==this.startingTurn; i=(i+1)%this.players.length) {
        const possibleWinner = this.players[i];
        const possibleWinnerCard = possibleWinner.discard.at(-1);
        if (!possibleWinnerCard) return false;
        else if (this.isCardBigger(possibleWinnerCard, trickWinnerCard)) {
          trickWinner = possibleWinner;
          trickWinnerCard = possibleWinnerCard;
        }
      }
    } else return false;

    return trickWinner;
  }

  clearDiscards() {
    const discardCards = [];
    for (const player of this.players) {
      let cardType;
      while (cardType = player.discard.pop()) {
        discardCards.push(cardType);
      }
    }
    return discardCards;
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

  getTurnPlayer() {
    return this.players[this.turn];
  }

  mapIndex(inx, max) { // Different index mapper for different numbers of cards
    if (this.indexMappers[max]) {
      return this.indexMappers[max][inx];
    } else {
      const indexMapper = {};
      const values = [];
      for (let i=0; i<max; ++i) values.push(i);
      for (let i=0; i<max; ++i) indexMapper[i] = values.splice(Math.floor(Math.random() * values.length), 1)[0];
      this.indexMappers[max] = indexMapper;

      return indexMapper[inx];
    }
  }

  delete() {
    delete GameLogic.games[this.id];
  }
}

export default GameLogic;
