class Model {
  constructor(geometryFile, textureFile, dimensions, atlasTexcoords=null) { // override texcoords for card atlas
    this.dimensions = dimensions; // 2 or 3
    this.w = {}; // webgl data

    this.geometry = this.parseGeometry(`../models/${geometryFile}`, atlasTexcoords); // promise
    this.image = this.getImage(`../textures/${textureFile}`); // promise
  }

  static textureCache = {};
  getImage(file) {
    const image = new Image();
    image.src = file;

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
    this.model = new Model(Card.geometryFile, Card.textureFile, 3, Card.texcoords[this.type]);
  }

  static geometryFile = "card2.obj";
  static textureFile = "card-atlas.png";
  static texcoords = {
    "6d": [[[0, .5], [0, 1]], [[.5, 1], [0, 1]]],
  } // Plus a blank version for other player's cards.
}

class Player {
  constructor(cards) {
    this.cards = cards;
    // this.model = new Model(); // Possible player model.
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
