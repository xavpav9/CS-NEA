import Scene from "./ui.js";
import {rp} from "./ui.js";
import {Model, Card, Player, Pickup, Trick} from "./objects.js";

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

class Game {
  constructor(canvas) {
    this.scene = new Scene(canvas, this);
    this.state = "idle";
    this.deck = new Deck(this.scene); // TODO: The deck needs to be moved serverside.
    this.dealt = false;
    this.selection = [];

    this.pickupPile = new Pickup(this.scene, this.deck.cards);

    this.players = [];

    this.scene.setPickup(this.pickupPile);
    this.scene.render();
  }

  addPlayer(side, mainPlayer) {
    if (side === "front") this.players.unshift(new Player(this.scene, mainPlayer));
    else if (side === "back") this.players.push(new Player(this.scene, mainPlayer));
  }

  deal() {
    if (!this.dealt) {
      const deckLength = this.pickupPile.cards.length;

      for (let i=0; i<deckLength; ++i) {
        const player = this.players[i % (this.players.length)];
        const currentCard = Math.floor(i / this.players.length);

        setTimeout(() => this.pickupPile.dealCard(player, currentCard), i*50);;
      }
    }

    this.dealt = true;
  }

  setState(state) {
    this.state = state;
  }

  getCardSelection() {
    return this.selection;
  }

  passCards(cardTypes, cardIndices) {
    const cardsArr = [];
    const nextPlayerArr = [];
    const newCardInxsArr = []; // The indices of where the cards should go
    const numOfCardsArr = [];

    // Collect destination data
    this.players.forEach((player, inx) => {
      const nextPlayer = this.players[(inx + 1) % this.players.length];
      const cards = player.cards.filter((card, cardInx) => cardIndices.slice(inx*3, (inx+1)*3).includes(cardInx));

      cardsArr.push(cards);
      nextPlayerArr.push(nextPlayer);
      newCardInxsArr.push(cardIndices.slice(
        ((inx + 1) * 3) % cardIndices.length,
        ((inx + 2) * 3 === cardIndices.length) ? cardIndices.length : ((inx + 2) * 3) % cardIndices.length,
      ));

      numOfCardsArr.push(nextPlayer.cards.length);
    });

    // Pass cards to correct destinations
    this.players.forEach((player, inx) => {
      player.passCards(cardsArr[inx], nextPlayerArr[inx], newCardInxsArr[inx], numOfCardsArr[inx]);
    });
  }
  
  click(card) {
    switch (this.state) {
      case "idle":
        /* For offline play
        if (card.doc === this.pickupPile) {
          this.deal();

          this.players.find(player => player.mainPlayer).turn = true;
          this.setState("start");
        }
        */
        break;
      case "start": // Select 3 cards to give to an opponent
        if (card.player) this.selection = this.scene.setStartAnimation(card);

        break;
      case "main":
        // TODO: Set up main game logic serverside.
        if (card.player && card.player.mainPlayer && card.player.turn) {
          card.player.turn = false;
          card.player.playCard(card);

          // TODO: Manage player turns
        }

        break;
    }
  }
}

export default Game;
