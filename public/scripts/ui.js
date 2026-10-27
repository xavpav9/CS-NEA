import {m3, m4, v3} from "./linear-algebra.js";
import {Node, Animation} from "./objects.js";

const UP_ANIMATION_TIME = 150;

const rp = { // Rendering Parameters
  ANGLE_SEPARATION: Math.PI/32, // Separation of cards on circle around player.
  CARD_DIST: 20, // Radius of circle which cards lie on from the player.
  DIP: -6, // How far cards are below line-of-sight of player.

  TRICK_COLUMN_SEPARATION: 0.3,
  TRICK_ROW_SEPARATION: 0.4,
  TRICKS_PER_ROW: 4,
}

class Scene {
  constructor(canvas, game) {
    this.canvas = canvas;
    this.gl = this.canvas.getContext("webgl2");
    this.game = game; // The game using the scene. Required such that inputs can be delivered.

    this.players = [];
    this.playerCards = [];

    this.pickups = [];
    this.tricks = [];
    this.discards = [];
    this.docCards = [];

    this.models = [];
    this.textureCount = 1; // 0 is the picking texture
    this.textures = [null]; // Cache of textures

    this.cameraPosition = [0, 20, 34];
    this.origin = new Node(); // Root node of scene graph
    this.currentId = 0; // Current thing being picked (0 = nothing)
    this.active = true; // Whether rendering or not
    this.pickupPile = null; // Pickup pile at centre

    this.mouseX = -1;
    this.mouseY = -1;

    this.gl.canvas.addEventListener("mousemove", evt => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = evt.clientX - rect.left;
      this.mouseY = evt.clientY - rect.top;
    });

    this.gl.canvas.addEventListener("click", evt => {
      if (evt.button === 0 && this.currentId !== 0) {
        const card = this.getAllCards().find(val => val.id === this.currentId);

        if (card) this.game.click(card);
      }
    });

    this.programs = (async () => {
      // Vertices + Colour program
      const vsResponse = await fetch("../shaders/vs.glsl");
      const vsSource = await vsResponse.text();
      const vs = this.createShader(this.gl.VERTEX_SHADER, vsSource);


      const fsResponse = await fetch("../shaders/fs.glsl");
      const fsSource = await fsResponse.text();
      const fs = this.createShader(this.gl.FRAGMENT_SHADER, fsSource);

      const program = this.createProgram(vs, fs);

      // Textures + Normals program
      const vsTexResponse = await fetch("../shaders/vsTex.glsl");
      const vsTexSource = await vsTexResponse.text();
      const vsTex = this.createShader(this.gl.VERTEX_SHADER, vsTexSource);

      const fsTexResponse = await fetch("../shaders/fsTex.glsl");
      const fsTexSource = await fsTexResponse.text();
      const fsTex = this.createShader(this.gl.FRAGMENT_SHADER, fsTexSource);

      const texProgram = this.createProgram(vsTex, fsTex);

      // Picking program
      const vsPickingResponse = await fetch("../shaders/vsPicking.glsl");
      const vsPickingSource = await vsPickingResponse.text();
      const vsPicking = this.createShader(this.gl.VERTEX_SHADER, vsPickingSource);


      const fsPickingResponse = await fetch("../shaders/fsPicking.glsl");
      const fsPickingSource = await fsPickingResponse.text();
      const fsPicking = this.createShader(this.gl.FRAGMENT_SHADER, fsPickingSource);

      const pickingProgram = this.createProgram(vsPicking, fsPicking);

      return [program, texProgram, pickingProgram];
    })();
  }

  /* TODO
   * Animations: - Activated from player objects
   * pickUpCard(player, card);
   * placeDownCard(player, card);
   * changeGameState(number); // What the player should be doing (e.g. waiting, playing, selecting 3 cards, etc.)
   */

  stateStart(card) {
    const player = card.player;

    if (player) {
      // Keep card in air when clicked, and go down when clicked again.
      if (card.getAnimationType() === "up" || card.getAnimationType() === null) {
        // Max 3 cards up at once.
        const upCards = this.playerCards.filter(card => card.getAnimationType() === "upstick" && card.player === player);
        upCards.sort((a, b) => b.getAnimationStart() - a.getAnimationStart()); // cards go from newest to oldest
        upCards.slice(2).forEach(card => {
          card.setAnimation(new Animation("up", UP_ANIMATION_TIME, UP_ANIMATION_TIME), true);
          card.reverseAnimation("up");
        });

        card.setAnimation(new Animation("upstick", 0));
      } else {
        card.setAnimation(new Animation("up", UP_ANIMATION_TIME, UP_ANIMATION_TIME), true);
      }
    }

    return this.playerCards.filter(card => card.getAnimationType() === "upstick" && card.player === player);
  }

  playCard(card) {
    // Position of card relative to origin
    const position = card.model.worldMatrix.slice(12,15);

    // Set origin of position to the discard model
    for (let i=0; i<3; ++i) position[i] -= card.player.discard.model.source.translation[i];

    this.playerCards.splice(this.playerCards.indexOf(card), 1);

    card.setAnimation(new Animation("play", 1000, 1000, position));
    card.reverseAnimation("play");
  }

  async addPlayer(player) {
    this.players.push(player);
    player.model.setParent(this.origin);

    if (player.mainPlayer) player.position = this.cameraPosition;

    // Lay out players in a regular polygon around centre
    const playerCount = this.players.length;
    if (playerCount > 1) {
      const start = this.players.reduce((acc, player, inx) => player.mainPlayer ? inx : acc, 0);
      let i = (start + 1) % playerCount;
      let count = 1;

      for (let i=((start + 1)%playerCount); i!=start; i=(i+1)%playerCount) {
        // Multiply position by rotation matrix
        const angle = 2 * count * Math.PI / playerCount
        const matrix = m4.pitchRotation(angle);
        const position = this.cameraPosition.concat(0).map((val, inx, arr) => {
          return arr.reduce((acc, cur, row) => {
            return acc + cur * matrix[inx + row * 4];
          }, 0);
        }).slice(0, 3);
        this.players[i].position = position;
        this.players[i].angle = angle;
        count++;
      }
    }
  }


  async addTrick(trick, player) {
    this.tricks.push(trick);

    trick.model.setParent(this.origin);
  }


  async addDiscard(discard, player) {
    this.discards.push(discard);

    discard.model.setParent(this.origin);
  }


  async setPickup(pickup) {
    this.pickupPile = pickup;
    this.pickups.push(pickup);

    pickup.model.setParent(this.origin);
  }


  async addPlayerCard(card) {
    this.playerCards.push(card);

    card.model.setParent(card.player.model);

    if (!card.model.ready) {
      this.addModel(card.model);
    } else {
      card.model.startRendering = true;
    }
  }


  removePlayerCard(card) {
    if (this.playerCards.includes(card)) {
      this.playerCards.splice(this.playerCards.indexOf(card), 1);
    }
  }


  async addDocCard(card) {
    this.docCards.push(card);

    card.model.setParent(card.doc.model);

    if (!card.model.ready) {
      this.addModel(card.model);
    }
  }


  removeDocCard(card) {
    if (this.docCards.includes(card)) {
      this.docCards.splice(this.docCards.indexOf(card), 1);
    }
  }


  async addModel(model) { // 3D model
    let size, type, normalise, stride, offset;
    let mipLevel, internalFormat, srcFormat, srcType;

    const geometry = await model.geometry;
    const [program, texProgram] = await this.programs;

    model.w.count = geometry.bufferData.length / 3;
    model.w.vao = this.gl.createVertexArray();
    model.w.uniforms = {};
    model.w.uniformLocations = {};

    if (!(geometry.hasNormals || geometry.hasTexcoords)) {
      model.w.program = program;
      const colourUniformLocation = this.gl.getUniformLocation(model.w.program, "u_colour");

      model.w.uniforms.colour = [1, 0, 0, 1];
      model.w.uniformLocations.colour = colourUniformLocation;

    } else {
      model.w.program = texProgram;
      model.w.uniformLocations.image = this.gl.getUniformLocation(model.w.program, "u_image");
      const texcoordAttribLocation = this.gl.getAttribLocation(model.w.program, "a_texcoord");
      const normalAttribLocation = this.gl.getAttribLocation(model.w.program, "a_normal");

      // Set up normal buffer
      model.w.normalBuffer = this.gl.createBuffer();
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, model.w.normalBuffer);
      this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(geometry.normalBufferData), this.gl.STATIC_DRAW);
      this.gl.bindVertexArray(model.w.vao);
      this.gl.enableVertexAttribArray(normalAttribLocation);
      size = 3;
      type = this.gl.FLOAT;
      normalise = false;
      stride = 0;
      offset = 0;
      this.gl.vertexAttribPointer(normalAttribLocation, size, type, normalise, stride, offset);


      // Set up texture coordinate buffer
      model.w.texcoordBuffer = this.gl.createBuffer();
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, model.w.texcoordBuffer);
      this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(geometry.texcoordBufferData), this.gl.STATIC_DRAW);
      this.gl.bindVertexArray(model.w.vao);
      this.gl.enableVertexAttribArray(texcoordAttribLocation);
      size = 2;
      type = this.gl.FLOAT;
      normalise = false;
      stride = 0;
      offset = 0;
      this.gl.vertexAttribPointer(texcoordAttribLocation, size, type, normalise, stride, offset);

      // If texture already in use, use that textureUnit.
      if (this.textures.includes(model.image)) {
        model.w.textureUnit = this.textures.indexOf(model.image)
      } else {
        model.w.textureUnit = this.textureCount
        this.textures.push(model.image);
      };

      // Set up texture
      const texture = this.gl.createTexture();
      this.gl.activeTexture(this.gl.TEXTURE0 + model.w.textureUnit);
      this.gl.bindTexture(this.gl.TEXTURE_2D, texture);

      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);

      mipLevel = 0;
      internalFormat = this.gl.RGBA;
      srcFormat = this.gl.RGBA;
      srcType = this.gl.UNSIGNED_BYTE;
      this.gl.texImage2D(this.gl.TEXTURE_2D, mipLevel, internalFormat, srcFormat, srcType, model.image);
      this.gl.generateMipmap(this.gl.TEXTURE_2D);

      if (model.w.textureUnit === this.textureCount) this.textureCount++;
    }


    const worldMatrixUniformLocation = this.gl.getUniformLocation(model.w.program, "u_world");
    const viewProjectionMatrixUniformLocation = this.gl.getUniformLocation(model.w.program, "u_viewProjection");
    const positionAttribLocation = this.gl.getAttribLocation(model.w.program, "a_position");

    // Set up position buffer
    model.w.buffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, model.w.buffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(geometry.bufferData), this.gl.STATIC_DRAW);
    this.gl.bindVertexArray(model.w.vao);
    this.gl.enableVertexAttribArray(positionAttribLocation);
    size = 3;
    type = this.gl.FLOAT;
    normalise = false;
    stride = 0;
    offset = 0;
    this.gl.vertexAttribPointer(positionAttribLocation, size, type, normalise, stride, offset);

    model.w.uniforms.worldMatrix = m4.yawRotation(Math.PI); // y is opposite way around for models
    model.w.uniformLocations.world = worldMatrixUniformLocation;
    model.w.uniformLocations.viewProjection = viewProjectionMatrixUniformLocation;

    this.models.push(model);
    model.ready = true;
    model.startRendering = true;
  }


  dealCard(card, player, cardInx, animationCallback) {
    // Calculate worldMatrix from perspective of player
    card.model.setParent(player.model);

    card.model.source.reset();
    this.setPlayerCardModel(card, cardInx, cardInx);
    this.origin.updateWorldMatrix();

    const position = card.model.worldMatrix.slice(12,15);

    // Render position from perspective of pickup pile
    card.model.setParent(card.doc.model);

    card.setAnimation(new Animation("pickup", 2000, 0, position, animation => animationCallback(animation)));
  }


  //TODO
  passCard(card, otherPlayer, newCardInx, animationCallback) {
    card.player = null;
    // Position when in player's hand
    const startPosition = card.model.worldMatrix.slice(12,15);

    // Position when in newPlayer's hand
    card.model.setParent(otherPlayer.model);
    card.model.source.reset();
    this.setPlayerCardModel(card, 13, newCardInx);
    this.origin.updateWorldMatrix();

    const endPosition = card.model.worldMatrix.slice(12, 15);

    const translation = endPosition.map((val, inx) => val - startPosition[inx]);

    // Render position from perspective of origin
    card.model.setParent(this.origin);
    card.animationPosition = startPosition;

    card.setAnimation(new Animation("passCard", 2000, 0, translation, animation => animationCallback(animation)));
  }


  removeModel(model) {
    if (this.models.includes(model)) this.models.splice(this.models.indexOf(model), 1);
  }


  setPlayerCardModel(card, numOfCards, count) {
    const model = card.model;
    model.source.translation[0] += rp.CARD_DIST * Math.sin((count - (numOfCards-1)/2) * rp.ANGLE_SEPARATION);
    model.source.translation[1] += rp.DIP;
    model.source.translation[2] += -rp.CARD_DIST * Math.cos((count - (numOfCards-1)/2) * rp.ANGLE_SEPARATION);

    // Rotate card to face player. Small yaw adjustment (Math.PI/32) such that card faces show.
    model.source.rotation[0] += Math.acos(-rp.DIP/rp.CARD_DIST) // roll
    model.source.rotation[2] += -Math.atan(model.source.translation[0] / model.source.translation[2]) - Math.PI/32; // yaw

    return model;
  }

  setTrickCardModel(card, count) {
    const model = card.model;

    model.source.rotation[0] += Math.PI; // Facedown
    model.source.rotation[1] += -player.angle // Pitch In line with player view
    model.source.translation[1] += 0.025 + 0.05 * count; // 0.05 = depth of card

    // Variations in card placement
    model.source.rotation[1] += (card.randomness - 0.5) * (Math.PI / 16)
    model.source.translation[0] += card.randomness * 0.5
    model.source.translation[2] += card.randomness * 0.5

    return model;
  }

  setDiscardCardModel(card) {
    const model = card.model;

    model.source.rotation[1] += -card.player.angle;

    return model;
  }

  setPickupCardModel() {
  }


  getAllCards() {
    const cards = [];
    for (const card of this.playerCards.concat(this.docCards)) {
      if (!cards.includes(card)) cards.push(card);
    }
    return cards;
  }

  getAllDocs() {
    const docs = [];
    for (const doc of this.pickups.concat(this.tricks).concat(this.discards)) {
      if (!docs.includes(doc)) docs.push(doc);
    }
    return docs;
  }

  async render() {
    if (this.gl === null) return null;

    const pickingProgram = (await this.programs)[2]

    // Picking framebuffer

    const pickingWorldMatrixUniformLocation = this.gl.getUniformLocation(pickingProgram, "u_world");
    const pickingViewProjectionMatrixUniformLocation = this.gl.getUniformLocation(pickingProgram, "u_viewProjection");
    const pickingIdUniformLocation = this.gl.getUniformLocation(pickingProgram, "u_id");
    
    const pickingTexture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, pickingTexture);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);

    const pickingRenderbuffer = this.gl.createRenderbuffer();
    this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, pickingRenderbuffer);

    const pickingFramebuffer = this.gl.createFramebuffer();
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, pickingFramebuffer);

    const textureAttachmentPoint = this.gl.COLOR_ATTACHMENT0;
    const renderbufferAttachmentPoint = this.gl.DEPTH_ATTACHMENT;
    const level = 0;
    this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, textureAttachmentPoint, this.gl.TEXTURE_2D, pickingTexture, level);
    this.gl.framebufferRenderbuffer(this.gl.FRAMEBUFFER, renderbufferAttachmentPoint, this.gl.RENDERBUFFER, pickingRenderbuffer);

    // Set framebuffer sizes (1 by 1)
    
    this.gl.activeTexture(this.gl.TEXTURE0 + 0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, pickingTexture);
    const internalFormat = this.gl.RGBA;
    const width = 1;
    const height = 1;
    const border = 0;
    const srcFormat = this.gl.RGBA;
    const srcType = this.gl.UNSIGNED_BYTE;
    const image = null;
    this.gl.texImage2D(this.gl.TEXTURE_2D, level, internalFormat, width, height, border, srcFormat, srcType, image);

    this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, pickingRenderbuffer);
    this.gl.renderbufferStorage(this.gl.RENDERBUFFER, this.gl.DEPTH_COMPONENT16, width, height);

    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);

    let then = 0;
    let dist = 0;
    const fovY = 9*Math.PI/24;
    const near = 1;
    const far = 10000;

    const draw = now =>  {
      const timeDelta = now - then;
      then = now;

      dist += timeDelta * 0.0001;

      // Reset TRS and Handle animations
      for (const card of this.getAllCards()) {
        card.model.source.reset();
        card.animate();
      }

      for (const doc of this.getAllDocs()) {
        doc.model.source.reset();
      }

      // Set up cameraMatrix and card translations
      let cameraMatrix = m4.identity();
      for (const player of this.players) {
        const playerCameraMatrix = m4.lookAt(player.position, [0, -2, 2])
        player.model.localMatrix = playerCameraMatrix;
        if (player.mainPlayer) cameraMatrix = playerCameraMatrix;

        // Set up cards in a circle around player.
        const numOfCards = player.cards.length;
        let cardCount = 0;
        for (const card of player.cards) {
          if (card.model.parentNode === player.model) {
            this.setPlayerCardModel(card, numOfCards, cardCount);
          }
          cardCount++;
        }

        // Set up tricks in front of players (on table)
        const numOfTricks = player.tricks.length;

        const x = player.position[0] * 0.4;
        const z = player.position[2] * 0.4;

        let trickCount = 0;
        for (const trick of player.tricks) {

          // Tricks are arranged in a grid. These are there relative placements in this grid.
          const columnOffset = rp.TRICK_COLUMN_SEPARATION * (trickCount % rp.TRICKS_PER_ROW - (rp.TRICKS_PER_ROW-1)/2);
          const rowOffset = rp.TRICK_ROW_SEPARATION * (Math.floor(trickCount / rp.TRICKS_PER_ROW));

          const currentX = x * (1 + rowOffset);
          const currentZ = z * (1 + rowOffset);

          // Placing tricks on the normal of the line (0, 0) to (z, x);
          trick.model.source.translation[0] += currentX + z * columnOffset;
          trick.model.source.translation[2] += currentZ + -x * columnOffset;


          let trickCardCount = 0;
          for (const card of trick.cards) {
            this.setTrickCardModel(card, trickCardCount);
            trickCardCount++;
          }
          trickCount++;
        }

        // Set up discard piles infront of players
        player.discard.model.source.translation[0] += player.position[0] * 0.1;
        player.discard.model.source.translation[1] += 0;
        player.discard.model.source.translation[2] += player.position[2] * 0.1;


        for (const card of player.discard.cards) {
          this.setDiscardCardModel(card)
        }
      }

      // Set up viewProjectionMatrix
      const viewMatrix = m4.inverse(cameraMatrix);
      const projectionMatrix = m4.perspective(fovY, this.gl.canvas.width/this.gl.canvas.height, near, far);
      const viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);


      // Update card source matrices
      let docCardCount = 0;
      for (const doc of this.pickups) {
        for (const card of doc.cards) {
          const model = card.model;

          model.source.rotation[0] += Math.PI // Facedown
          model.source.translation[1] += 0.025 + 0.05 * docCardCount; // 0.05 = depth of card

          // Variations in card placement
          model.source.rotation[1] += (card.randomness - 0.5) * (Math.PI / 16)
          model.source.translation[0] += card.randomness * .5
          model.source.translation[2] += card.randomness * .5

          docCardCount++;
        }
      }

      // gl.useProgram/gl.bindVertexArray is not necessary when it is already in use.
      let previousProgram = null;
      let previousVao = null;

      // Prepare frustum for picking framebuffer
      // Current viewing frustum:
      const aspect = this.gl.canvas.clientWidth / this.gl.canvas.clientHeight;
      const top = Math.tan(fovY * 0.5) * near;
      const bottom = -top;
      const right = aspect * top;
      const left = -right;
      const width = Math.abs(right - left);
      const height = Math.abs(top - bottom);

      // One pixel viewing frustum:
      const pixelXRatio = this.mouseX / this.gl.canvas.clientWidth; // How far along it is relative to width. Range: 0->1.
      const pixelYRatio = 1 - (this.mouseY + 1) / this.gl.canvas.clientHeight;
      const onePixelXRatio = 1 / this.gl.canvas.clientWidth;
      const onePixelYRatio = 1 / this.gl.canvas.clientHeight;

      const leftOfPixel = left + pixelXRatio * width;
      const bottomOfPixel = bottom + pixelYRatio * height;

      // Set up picking viewProjectionMatrix
      const pickingProjectionMatrix = m4.frustum(
        leftOfPixel,
        leftOfPixel + width*onePixelXRatio,
        bottomOfPixel,
        bottomOfPixel + height*onePixelYRatio,
        near,
        far,
      );
      const pickingViewProjectionMatrix = m4.multiply(pickingProjectionMatrix, viewMatrix);


      // Draw cards to picking framebuffer
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, pickingFramebuffer);

      this.gl.viewport(0, 0, 1, 1);
      this.gl.enable(this.gl.CULL_FACE);
      this.gl.cullFace(this.gl.BACK);
      this.gl.enable(this.gl.DEPTH_TEST);
      this.gl.clearColor(0, 0, 0, 0);
      this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

      const allCards = this.getAllCards();

      this.gl.useProgram(pickingProgram);
      for (const card of allCards) {
        const model = card.model;
        if (model.ready && model.rendering) {
          if (model.w.vao !== previousVao) {
            this.gl.bindVertexArray(model.w.vao);
            previousVao = model.w.vao;
          }

          const worldMatrix = m4.multiply(model.worldMatrix, model.w.uniforms.worldMatrix);

          this.gl.uniformMatrix4fv(pickingWorldMatrixUniformLocation, false, worldMatrix);
          this.gl.uniformMatrix4fv(pickingViewProjectionMatrixUniformLocation, false, pickingViewProjectionMatrix);
          this.gl.uniform4fv(pickingIdUniformLocation, [
            ((card.id >> 0) & 255) / 255, // bits 0-7
            ((card.id >> 8) & 255) / 255, // bits 8-15
            ((card.id >> 16) & 255) / 255, // bits 16-23
            ((card.id >> 24) & 255) / 255, // bits 24-31
          ]); // Expects values from 0->1

          let primitiveType = this.gl.TRIANGLES;
          let offset = 0;
          this.gl.drawArrays(primitiveType, offset, model.w.count);
        }
      }

      // Calculate id
      const data = new Uint8Array(4);
      this.gl.readPixels(
        0, // x = 0  as it is a one pixel viewing frustum
        0, // y = 0 -^
        1, // width
        1, // height
        this.gl.RGBA, // format
        this.gl.UNSIGNED_BYTE, // type
        data); // Returns value 0->255
      const oldId = this.currentId;
      this.currentId = data.reduce((acc, cur, inx) => acc + (cur << inx*8), 0);

      // Card hovered over has changed, so reverse "up" animation on new & old card (if they exist).
      if (this.currentId !== oldId) {
        const oldCard = allCards.find(val => val.id === oldId);
        const newCard = allCards.find(val => val.id === this.currentId);

        if (oldCard && oldCard.player && oldCard.player.mainPlayer) oldCard.reverseAnimation("up");
        if (newCard && newCard.player && newCard.player.mainPlayer) newCard.reverseAnimation("up");
      }

      // Card has been hovered on for at least two frames. Therefore, start an "up" animation.
      if (this.currentId && this.currentId === oldId) {
        const card = allCards.find(val => val.id === this.currentId);

        if (card.player && card.player.mainPlayer) {
          card.setAnimation(new Animation("up", UP_ANIMATION_TIME));

          this.canvas.style.cursor = "pointer";
        }
      } else {
        this.canvas.style.cursor = "default";
      }

      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);


      // Prepare to draw to canvas
      this.origin.updateWorldMatrix();
      this.resizeCanvas()
      this.gl.clearColor(0, 0, 0, 1);
      this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
      this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);

      // Draw models to canvas
      for (const model of this.models) {
        if (model.ready && model.rendering) {
          if (model.type === "card") {
            this.gl.enable(this.gl.CULL_FACE);
            this.gl.cullFace(this.gl.BACK);
            this.gl.enable(this.gl.DEPTH_TEST);

            if (model.w.program !== previousProgram) {
              this.gl.useProgram(model.w.program);
              previousProgram = model.w.program;
            }
            if (model.w.vao !== previousVao) {
              this.gl.bindVertexArray(model.w.vao);
              previousVao = model.w.vao;
            }


            const worldMatrix = m4.multiply(model.worldMatrix, model.w.uniforms.worldMatrix);

            this.gl.uniformMatrix4fv(model.w.uniformLocations.viewProjection, false, viewProjectionMatrix);
            this.gl.uniformMatrix4fv(model.w.uniformLocations.world, false, worldMatrix);

            if (model.w.textureUnit !== undefined) {
              this.gl.uniform1i(model.w.uniformLocations.image, model.w.textureUnit);
            } else {
              // this.gl.uniform4fv(model.w.uniformLocations.colour, model.w.uniforms.colour);
            }

            let primitiveType = this.gl.TRIANGLES;
            let offset = 0;
            this.gl.drawArrays(primitiveType, offset, model.w.count);
          }

          model.copySource();
        }

        if (model.startRendering) model.rendering = true;
      }

      if (this.active) requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
  }

  resizeCanvas() {
    const style = getComputedStyle(this.canvas);
    if (this.gl.canvas.width !== this.canvas.width || this.gl.canvas.height !== this.canvas.height || this.canvas.width !== parseInt(style.width) || this.canvas.height !== parseInt(style.height)) {
      this.canvas.width = parseInt(style.width);
      this.canvas.height = parseInt(style.height);

      this.gl.canvas.width = this.canvas.width;
      this.gl.canvas.height = this.canvas.height;
    }
  }

  createShader(type, source) {
    const shader = this.gl.createShader(type);
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    const success = this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS);

    if (success) return shader;
    else {
      console.warn(this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
    }
  }

  createProgram(vs, fs) {
    const program = this.gl.createProgram();
    this.gl.attachShader(program, vs);
    this.gl.attachShader(program, fs);
    this.gl.linkProgram(program);
    const success = this.gl.getProgramParameter(program, this.gl.LINK_STATUS);

    if (success) return program;
    else {
      console.warn(this.gl.getProgramInfoLog(program));
      this.gl.deleteProgram(program);
    }
  }
}

export {rp};
export default Scene;
