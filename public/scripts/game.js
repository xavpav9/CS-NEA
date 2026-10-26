import Scene from "./ui.js";
import {Model, Card, Player, Pickup, Trick} from "./objects.js";

class Deck {
  constructor() {
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

class Game {
  constructor(canvas, numOfPlayers) {
    this.scene = new Scene(canvas, this);
    this.state = "idle";
    this.deck = new Deck();
    this.deck.shuffle();

    this.pickupPile = new Pickup(this.scene, this.deck.cards);

    this.players = [];
    for (let i=0; i<numOfPlayers; ++i) {
      const mainPlayer = (i===0);

      const player = new Player(this.scene, mainPlayer);
      player.setTurn(mainPlayer);

      // player.addTrick(new Trick(this.scene, [new Card(this.scene, "6d")]));

      this.players.push(player);
    }

    this.scene.setPickup(this.pickupPile);
    this.scene.render();
  }

  deal() {
    const deckLength = this.pickupPile.cards.length;

    for (let i=0; i<deckLength; ++i) {
      const player = this.players[i % (this.players.length)];
      this.pickupPile.dealCard(player);
    }
  }

  setState(state) {
    this.state = state;
  }

  
  click(card) {
    switch (this.state) {
      case "idle":
        break;
      case "start": // Select 3 cards to give to an opponent
        const selection = this.scene.stateStart(card);
        break;
      case "main":
        card.player.playCard(card);
        break;
    }
  }
}

export default Game;
