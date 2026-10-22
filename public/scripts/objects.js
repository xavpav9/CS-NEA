class Model {
  constructor(geometry, texture) {
    this.texture = texture;
    this.geometry = parseGeometry(geometry);
  }

  parseGeometry(file) {
    // memoise results
    // return {
    // vertices: [],
    // texcoords: [],
    // }
  }
}

class Card {
  constructor(cardType) {
    this.type = cardType;
    this.model = Model(geometryFile, texturesFiles[cardType]);
  }

  /*
  static geometryFile = "../models/card.obj";
  static textureFiles = {
  } // Plus a blank version for other player's cards.
  */
}

class Player {
  constructor(cards) {
    this.cards = cards;
    // this.model = Model(); // Possible player model.
  }

  /*
   * Funcs:
   * playCard(card || inx)
   */
}

class AnimationState { // Information about an animation currently taking place.
  constructor(type, time) {
    // type could be changing a game state, placing a card, declaring the winner etc.
  }
}

export {Model, Card, Player, AnimationState};
