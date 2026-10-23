import {m4} from "./linear-algebra.js";

class Node {
  constructor(hasSource=true) {
    this.localMatrix = m4.identity();
    this.worldMatrix = m4.identity();
    this.children = [];
    this.parentNode = null;
    this.hasSource = hasSource;
    if (hasSource) this.source = new TRS();
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
}

class Model extends Node {
  constructor(type, geometryFile, textureFile, dimensions, atlasTexcoords=null, hasSource=true) { // override texcoords for card atlas
    super(hasSource);
    this.type = type;
    this.dimensions = dimensions; // 2 or 3
    this.w = {}; // webgl data
    this.id = 0; // Picking id

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


    const firstFace = geometry.faces[0];
    if (firstFace.length === 2) geometry.hasTexcoords = true;
    else if (firstFace.length === 3) {
      geometry.hasTexcoords = (firstFace[1] === null) ? false : true;
      geometry.hasNormals = true;
    }

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
  constructor(cardType) {
    this.type = cardType;
    this.id = null;
    this.player = null;
    this.location = null; //TODO
    if (Card.texcoords[this.type]) this.model = new Model("card", Card.geometryFile, Card.textureFile, 3, [Card.texcoords[this.type], Card.texcoords.back]);
    else this.model = new Model("card", Card.geometryFile, Card.textureFile, 3, [Card.texcoords.blank, Card.texcoords.back]);
  }

  static geometryFile = "card2.obj";
  static textureFile = "card-atlas.png";
  static texcoords = {
    "blank": [[0, 0], [0, 0]],
    "6d": [[0, .5], [0, 1]],
    "back": [[.5, 1], [0, 1]],
  } // Plus a blank version for other player's cards.
}

class Player {
  constructor(cards, mainPlayer) {
    this.cards = cards;
    this.model = new Model("player", "card2.obj", "card-atlas.png", 3, null, false); // TODO: Replace placeholer arguments.
    this.mainPlayer = mainPlayer; // Whether this player is the current client or not.
    this.position = [0, 0, 0];

    for (const card of this.cards) {
      card.model.setParent(this.model);
    }
  }

  /*
   * Funcs:
   * playCard(card || inx)
   */
}

class AnimationState { // Information about an animation currently taking place.
  constructor(type, time) {
    this.maxTime = time;
    this.start = Date.now();
    // type could be changing a game state, placing a card, declaring the winner etc.
  }
}

export {Model, Card, Player, AnimationState, Node, TRS};
