class Model {
  constructor(geometryFile, textureFile, dimensions) {
    this.dimensions = dimensions;
    this.geometry = this.parseGeometry(`../models/${geometryFile}`); // promise
    this.w = {}; // webgl data
    // this.texture = this.getTexture(`../textures/${textureFile}`); // promise
  }

  async getTexture(file) {
  }


  static properties = {
    v: function(geometry, args) {
      geometry.vertices.push(args.map(parseFloat));
    },

    f: function(geometry, args) {
      for (let i=0; i<args.length-2; ++i) {
        for (let j=0; j<3; ++j) {
          geometry.faces.push(parseFloat(args[(j === 0) ? 0 : i+j]))
        };
      };
    },

    "#": function(geometry, args) {},
  }

  static cache = {};
  async parseGeometry(file) { // obj files // only for v and f (no vn etc. yet)
    const key = JSON.stringify(file);
    if (Model.cache[key]) return Model.cache[key];

    const geometry = {
      vertices: [],
      faces: [],
      texcoords: [],
      normals: [],
      bufferData: [],
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

    for (const face of geometry.faces) {
      geometry.bufferData.push(...geometry.vertices[face-1]);
    }

    Model.cache[key] = geometry;
    return geometry;
  }
}

class Card {
  constructor(cardType) {
    this.type = cardType;
    this.model = Model(geometryFile, texturesFiles[cardType]);
  }

  static geometryFile = "card.obj";
  /*
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
