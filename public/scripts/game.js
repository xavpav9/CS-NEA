import Scene from "./ui.js";
import {rp} from "./ui.js";
import {Model, Card, Player, Pickup, Trick} from "./objects.js";

class Deck {
  constructor(scene) {
    this.scene = scene;
    this.cards = Deck.types.map(type => new Card(this.scene, "blank"));
  }

  static types = [
    "1c", "2c", "3c", "4c", "5c", "6c", "7c", "8c", "9c", "10c", "jc", "qc", "kc",
    "1d", "2d", "3d", "4d", "5d", "6d", "7d", "8d", "9d", "10d", "jd", "qd", "kd",
    "1h", "2h", "3h", "4h", "5h", "6h", "7h", "8h", "9h", "10h", "jh", "qh", "kh",
    "1s", "2s", "3s", "4s", "5s", "6s", "7s", "8s", "9s", "10s", "js", "qs", "ks",
  ];

  setPlayerCards(playerIndex, numOfPlayers, newCards) {
    // Set the textures on the cards the player is about to receive.
    // Note: Top card is at index -1.
    let currentCardInx = 0;
    for (let i=this.cards.length; i>0; --i) {
      if ((this.cards.length - i) % numOfPlayers === playerIndex && newCards[currentCardInx]) {
        const oldCard = this.cards[i-1];
        const doc = oldCard.doc;
        doc.removeCard(oldCard, false);

        const newCard = new Card(this.scene, newCards[currentCardInx]);
        this.cards[i-1] = newCard;
        doc.addCard(newCard, i-1);

        currentCardInx++;
      }
    }
  }
}

class Game {
  constructor(canvas) {
    this.scene = new Scene(canvas, this);
    this.state = "idle";
    this.deck = new Deck(this.scene);
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

  setMainPlayerCards(cards) {
    const mainPlayerIndex = this.players.indexOf(this.players.find(player => player.mainPlayer));
    this.deck.setPlayerCards(mainPlayerIndex, this.players.length, cards);
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

  passCardSelection(cardTypes, cardIndices) {
    const cardsArr = [];
    const nextPlayerArr = [];
    const newCardInxsArr = []; // The indices of where the cards should go
    const numOfCardsArr = [];

    // Collect destination data
    this.players.forEach((player, inx) => {
      const nextPlayer = this.players[(inx + 1) % this.players.length];
      const playerCardIndices = cardIndices.slice(inx*3, (inx+1)*3)
      const cards = player.cards.filter((card, cardInx) => playerCardIndices.includes(cardInx));


      if (nextPlayer.mainPlayer) {
        // Set values of player cards
        cards.forEach((card, cardInx) => {
          player.removeCard(card, false);

          // Create new card, and set model matrix for animation
          const newCard = new Card(this.scene, cardTypes[cardInx]);
          player.addCard(newCard, playerCardIndices[cardInx]);
          this.scene.setPlayerCardModel(newCard, player.cards.length, playerCardIndices[cardInx]);

          cards[cardInx] = newCard;
        });
      }

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
