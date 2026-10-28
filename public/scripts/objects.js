import {m4} from "./linear-algebra.js";

let id = 1; // id=0 is when nothing is selected

class Node {
  constructor(hasSource=true) {
    this.localMatrix = m4.identity();
    this.worldMatrix = m4.identity();
    this.children = [];
    this.parentNode = null;
    this.hasSource = hasSource;
    if (hasSource) {
      this.source = new TRS(); // This is where the source is updated
      this.currentSource = new TRS(); // The last calculated source
    }
  }

  copySource() {
    if (this.hasSource) {
      TRS.copySource(this.source, this.currentSource);
    }
  }

  setParent(parentNode) {
    if (this.parentNode) {
      this.parentNode.children.splice(this.parentNode.children.indexOf(this), 1);
    }

    if (parentNode) { // so not null
      parentNode.children.push(this);
    }

    this.parentNode = parentNode;
  }

  updateWorldMatrix(parentNodeWorldMatrix=null, updateChildren=true) {
    if (this.hasSource) this.localMatrix = this.source.getMatrix();

    if (parentNodeWorldMatrix || this.parentNode) {
      this.worldMatrix = m4.multiply(parentNodeWorldMatrix || this.parentNode.worldMatrix, this.localMatrix);
    } else {
      this.worldMatrix = structuredClone(this.localMatrix);
    }


    if (updateChildren) this.children.forEach(child => child.updateWorldMatrix());

  }
}

class TRS {
  constructor(translation=[0,0,0], rotation=[0,0,0], scaling=[1,1,1]) {
    this.translation = translation;
    this.rotation = rotation;
    this.scaling = scaling;
  }

  getMatrix() {
    let matrix = m4.scaling(...this.scaling);
    matrix = m4.yaw(matrix, this.rotation[2]);
    matrix = m4.pitch(matrix, this.rotation[1]);
    matrix = m4.roll(matrix, this.rotation[0]);
    return m4.translate(matrix, ...this.translation);
  }

  reset() {
    this.translation = [0, 0, 0];
    this.rotation = [0, 0, 0];
    this.scaling = [1, 1, 1];
  }

  static copySource(src, dest) {
    dest.translation = src.translation;
    dest.rotation = src.rotation;
    dest.scaling = src.scaling;
  }
}

class Model extends Node { // 3D Model
  constructor(type, geometryFile, textureFile, atlasTexcoords=null, hasSource=true) { // override texcoords for card atlas
    super(hasSource);
    this.type = type; // e.g. "card", "player", etc.
    this.w = {}; // webgl data

    this.ready = false; // Whether Buffers/vaos/uniforms have been setup
    this.startRendering = false; // Should this model be rendered starting from the next frame
    this.rendering = false; // Should this model be rendered

    this.geometry = this.parseGeometry(`../models/${geometryFile}`, atlasTexcoords); // promise
    this.image = this.getImage(`../textures/${textureFile}`); // promise
  }

  static textureCache = {};
  getImage(file) {
    const key = JSON.stringify(file);
    if (Model.textureCache[key]) return Model.textureCache[key];

    const image = new Image();
    image.src = file;

    Model.textureCache[key] = image;
    return image;
  }


  static properties = {
    v: function(geometry, args) {
      geometry.vertices.push(args.map(parseFloat));
    },

    f: function(geometry, args) {
      for (let i=0; i<args.length-2; ++i) {
        for (let j=0; j<3; ++j) {
          geometry.faces.push(args[(j === 0) ? 0 : i+j].split("/").map(parseFloat).map(val => Number.isNaN(val) ? null : val));
        };
      };
    },

    vn: function(geometry, args) {
      geometry.normals.push(args.map(parseFloat));
    },

    vt: function(geometry, args) {
      geometry.texcoords.push(args.map(parseFloat));
    },

    "#": function(geometry, args) {},
    o: function(geometry, args) {},
  }

  static geometryCache = {};
  async parseGeometry(file, atlasTexcoords=null) { // obj files only
    const key = JSON.stringify(file);
    if (Model.geometryCache[key]) return Model.geometryCache[key];

    const geometry = {
      vertices: [],
      faces: [],
      texcoords: [],
      normals: [],

      bufferData: [],
      normalBufferData: [],
      texcoordBufferData: [],

      hasVertices: true,
      hasTexcoords: false,
      hasNormals: false,
    }

    const response = await fetch(file)
    const data = await response.text();
    const lines = data.split("\n");

    for (const untrimmedLine of lines) {
      const line = untrimmedLine.trim().split(" ");
      if (line.length < 2) continue;
      const property = line[0];
      const args = line.slice(1);

      Model.properties[property](geometry, args);
    }


    if (atlasTexcoords !== null) { // atlasTexcoords = [[minx, maxx], [miny, maxy]] for the front face, then again for the back face.

      // texcoord = [0,0], [0,1], [1,0] or [1,1]
      let count = 0;
      for (const texcoord of geometry.texcoords) {
        for (let i=0; i<2; ++i) {
          texcoord[i] = atlasTexcoords[Math.floor(count / 4)][i][texcoord[i]];
        }
        count++;
      }
    }


    // Check which properties this model has (vertices, texcoords & normals)
    const firstFace = geometry.faces[0];
    if (firstFace.length === 2) geometry.hasTexcoords = true;
    else if (firstFace.length === 3) {
      geometry.hasTexcoords = (firstFace[1] === null) ? false : true;
      geometry.hasNormals = true;
    }

    // Fill in buffers with face data
    for (const face of geometry.faces) {
      geometry.bufferData.push(...geometry.vertices[face[0]-1]);
      if (geometry.hasTexcoords) geometry.texcoordBufferData.push(...geometry.texcoords[face[1]-1]);
      if (geometry.hasNormals) geometry.normalBufferData.push(...geometry.normals[face[2]-1]);
    }

    Model.geometryCache[key] = geometry;
    return geometry;
  }
}

class Card {
  constructor(scene, cardType) {
    this.scene = scene;
    this.type = cardType;
    this.player = null;
    this.doc = null;
    this.animation = null;
    this.randomness = Math.random(); // A constant random number for variation in card placement
    this.animationPosition = [0, 0, 0]; // A position being used for an animation

    this.id = id; // picking id
    id++;

    const texcoords = this.getTexcoords(this.type);
    const blank = this.getTexcoords("blank");
    const back = this.getTexcoords("back");
    this.model = new Model("card", Card.geometryFile, Card.textureFile, [(texcoords) ? texcoords : blank, back]);
  }

  static geometryFile = "card.obj";
  static textureFile = "card-atlas.png";

  setAnimation(animation, force=false) {
    if (animation === null) {
      this.animation = null;
    } else if (force || this.animation === null || animation.priority > this.animation.priority) {
      this.animation = animation;
    }
  }

  animate() {
    if (this.animation !== null) {
      this.animation.update(this);
    }
  }

  reverseAnimation(...types) {
    if (this.animation && types.includes(this.animation.type)) {
      this.animation.reverse();
    }
  }

  isAnimationReversed() {
    return (this.animation) ? this.animation.reversed : null;
  }

  getAnimationType() {
    return (this.animation) ? this.animation.type : null;
  }

  getAnimationStart() {
    return (this.animation) ? this.animation.start : null;
  }

  getTexcoords(type) {
    // 1989x895, 11px gap between images (and at top and bottom)
    const pixelX = 1/1989;
    const pixelY = 1/895;

    if (type === "blank") return [[0, 0], [0, 0]];
    else if (type === "back") return [[0, pixelX], [0, pixelY]];

    const gapX = pixelX * 11;
    const gapY = pixelY * 11;

    const num = type.slice(0, -1);
    const suit = type.slice(-1);

    const cardHeight = 1/4;
    const cardWidth = 1/13;

    const x = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "j", "q", "k"].indexOf(num)/13;
    const y = ["h", "d", "c", "s"].indexOf(suit)/4;

    return [
      [x + gapX, x + cardWidth],
      [y + gapY, y + cardHeight],
    ];
  }
}

class DOC { // Deck of Cards
  constructor(scene, cards=[]) {
    this.scene = scene;
    // this.type = type; // discard or pickup or trick
    this.cards = [];
    this.model = new Model("doc", "card.obj", "card-atlas.png"); // TODO: Replace placeholder arguments.
    this.player = null;

    cards.forEach(card => this.addCard(card));
  }

  addCard(card) {
    card.doc = this;
    this.cards.push(card);

    this.scene.addDocCard(card);
  }
}

class Pickup extends DOC {
  constructor(scene, cards=[]) {
    super(scene, cards);
    this.topCardOffset = 0;
  }

  popCard() {
    if (this.cards.length) {
      const card = this.cards.splice(this.cards.length-1, 1)[0];
      this.scene.removeDocCard(card);

      return card;
    } else return false;
  }

  topCard() {
    return (this.cards.length) ? this.cards.at(-1 - this.topCardOffset) : false;
  }
  
  dealCard(player, cardInx) {
    const card = this.topCard();
    this.topCardOffset++; // Keep card in pickup pile, but it is not actually the top card

    this.scene.dealCard(card, player, cardInx, animation => {
      // Halt any rendering
      card.setAnimation(null);
      card.model.startRendering = false;
      card.model.rendering = false;

      // Move card from here to player
      this.popCard();
      this.topCardOffset--;
      player.addCard(card);
    });
  }
}

class Trick extends DOC {
  constructor(scene, cards=[]) {
    super(scene, cards);
  }
}

class Discard extends DOC {
  constructor(scene, cards=[]) {
    super(scene, cards);
  }
}

class Player {
  constructor(scene, mainPlayer) {
    this.scene = scene;
    this.cards = [];
    this.tricks = [];
    this.discard = new Discard(this.scene);

    this.mainPlayer = mainPlayer; // Whether this player is the current client or not.
    this.turn = false; // Whether it is this players current turn
    this.threeCardsSelected = false;
    this.sorting = false; // Whether players cards are currently being sorted or not.

    // Rendering attributes
    this.model = new Model("player", "card.obj", "card-atlas.png", null, false); // TODO: Replace placeholder arguments.
    this.position = [0, 0, 0]; // Position in world
    this.angle = 0; // Angle around table

    // Set up player rendering
    this.scene.addPlayer(this);

    this.discard.player = this;
    this.scene.addDiscard(this.discard);
  }

  addCard(card, index=null) {
    card.player = this;
    card.doc = null;

    if (index) this.cards.splice(index, 0, card);
    else this.cards.push(card);

    this.scene.addPlayerCard(card)
  }

  removeCard(card) {
    if (this.cards.includes(card)) {
      card.player = null;
      this.cards.splice(this.cards.indexOf(card), 1);
      this.scene.removePlayerCard(card);
    }
  }

  addTrick(trick) {
    trick.player = this;
    trick.cards.forEach(card => card.player = this);

    this.tricks.push(trick);
    this.scene.addTrick(trick);
  }

  playCard(card) {
    this.cards.splice(this.cards.indexOf(card), 1);
    this.discard.addCard(card);

    this.scene.playCard(card);
  }

  passCards(cards, otherPlayer, newCardInxs) { // Cards go to another player
    cards.forEach((card, inx) => {
      this.scene.passCard(card, otherPlayer, newCardInxs[inx], (animation) => {
        card.setAnimation(null);
        card.animationPosition = [0, 0, 0];

        card.model.startRendering = false;
        card.model.rendering = false;

        this.removeCard(card);
        otherPlayer.addCard(card, newCardInxs[inx]);
      });
    });
  }

  moveCards(cards, cardTypes) { // Cards stay with current player
    const newCardInxs = this.cards.map(card => cardTypes.indexOf(card.type));
    const animationsFinished = [];

    cards.forEach((card, inx) => {
      animationsFinished.push(false);
      this.scene.moveCard(card, newCardInxs[inx], animation => {
        card.setAnimation(null);

        animationsFinished[inx] = true;
        if (animationsFinished.every(bool => bool)) this.sorting = false;
      });
    });

    this.cards.sort((a, b) => cardTypes.indexOf(a.type) - cardTypes.indexOf(b.type));
  }

  sortCards() {
    if (!this.sorting) {
      this.sorting = true;

      const cardTypes = this.cards.map(card => card.type);

      const priorityNum = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "j", "q", "k"];
      const prioritySuit = ["h", "s", "d", "c"];

      cardTypes.sort((a, b) => {
        const numA = a.slice(0, -1);
        const numB = b.slice(0, -1);
        const suitA = a.slice(-1);
        const suitB = b.slice(-1);

        const priorityA = priorityNum.indexOf(numA) + 100 * prioritySuit.indexOf(suitA);
        const priorityB = priorityNum.indexOf(numB) + 100 * prioritySuit.indexOf(suitB);

        return priorityA - priorityB;
      });

      // Only animate if cards are not sorted
      if (!this.cards.every((card, inx) => card.type === cardTypes[inx])) {
        this.moveCards(this.cards, cardTypes);
      } else {
        this.sorting = false;
      }
    }
  }
}

class Animation { // Information about an animation currently taking place.
  constructor(type, time, currentTime=0, customTranslation=[0,0,0], callback=null) { // time/ms
    // type could be changing a game state, placing a card, declaring the winner etc.
    this.reversed = false;
    this.type = type;
    this.customTranslation = customTranslation;
    this.callback = callback;

    this.maxTime = time;
    this.start = Date.now() - currentTime;
    this.priority = Animation.priorityScale[type]; // Higher = more priority (1+);
  }

  static priorityScale = {
    up: 1,
    upstick: 2,
    play: 3,
    pickup: 3,
    passCard: 3,
    moveCard: 3,
  }

  reverse() {
    this.reversed = !this.reversed;
    const timeElapsed = Math.min(this.maxTime, Date.now() - this.start)
    this.start = Date.now() - (this.maxTime - timeElapsed);
  }

  update(object) {
    const timeFraction = (this.maxTime > 0) ? Math.min(this.maxTime, Date.now() - this.start) / this.maxTime : 1;
    const multiplier = (this.reversed) ? 1 - timeFraction : timeFraction;

    switch (this.type) {
      case "up":
      case "upstick":
        object.model.source.translation = [0, 1, -0.25].map(val => val * multiplier);
        break;
      case "moveCard":
      case "pickup":
      case "play":
        object.model.source.translation = this.customTranslation.map(val => val * multiplier);
        break;
      case "passCard":
        object.model.source.rotation[0] = Math.PI; // Facedown
        object.model.source.translation = object.animationPosition.map((val, inx) => 
          val + this.customTranslation.map(val => val * multiplier)[inx]
        );
        break;
    }

    if (timeFraction === 1) { // Reached end of animation.
      if (this.callback) this.callback(this);
      else if (this.reversed) object.setAnimation(null); // 1. Cancels animation when back in original place
    };
  }
}

export {
  Model,
  Card,
  Player,

  Animation,

  Node,
  TRS,

  DOC,
  Pickup,
  Discard,
  Trick,
};
