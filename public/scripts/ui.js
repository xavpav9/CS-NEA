import {m3, m4, v3} from "./linear-algebra.js";
import {Node} from "./objects.js";

class Scene {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = this.canvas.getContext("webgl2");
    this.players = [];
    this.models = [];
    this.gameState = 0;
    this.animations = [];
    this.textureCount = 0;
    this.textures = [];
    this.cameraPosition = [0, 30, 50];
    this.origin = new Node();

    this.programs = (async () => {
      const vsResponse = await fetch("../shaders/vs.glsl");
      const vsSource = await vsResponse.text();
      const vs = this.createShader(this.gl.VERTEX_SHADER, vsSource);


      const fsResponse = await fetch("../shaders/fs.glsl");
      const fsSource = await fsResponse.text();
      const fs = this.createShader(this.gl.FRAGMENT_SHADER, fsSource);

      const program = this.createProgram(vs, fs);

      const vsTexResponse = await fetch("../shaders/vsTex.glsl");
      const vsTexSource = await vsTexResponse.text();
      const vsTex = this.createShader(this.gl.VERTEX_SHADER, vsTexSource);


      const fsTexResponse = await fetch("../shaders/fsTex.glsl");
      const fsTexSource = await fsTexResponse.text();
      const fsTex = this.createShader(this.gl.FRAGMENT_SHADER, fsTexSource);

      const texProgram = this.createProgram(vsTex, fsTex);

      return [program, texProgram];
    })();
  }

  /*
   * Animations: - Activated from player objects
   * pickUpCard(player, card);
   * placeDownCard(player, card);
   * changeGameState(number); // What the player should be doing (e.g. waiting, playing, selecting 3 cards, etc.)
   */

  async addPlayer(player) {
    this.players.push(player);
    player.model.setParent(this.origin);

    if (player.mainPlayer) {
      player.model.localMatrix = m4.lookAt(this.cameraPosition, [0, 0, 0]);
      player.position = this.cameraPosition;
    }

    // Lay out players in a regular polygon around centre
    const playerCount = this.players.length;
    if (playerCount > 1) {
      const start = this.players.reduce((acc, player, inx) => player.mainPlayer ? inx : acc, 0);
      let i = (start + 1) % playerCount;
      let count = 1;

      for (let i=((start + 1)%playerCount); i!=start; i=(i+1)%playerCount) {
        // Multiply position by rotation matrix
        const matrix = m4.pitchRotation(2 * count * Math.PI / playerCount);
        const position = this.cameraPosition.concat(0).map((val, inx, arr) => {
          return arr.reduce((acc, cur, row) => {
            return acc + cur * matrix[inx + row * 4];
          }, 0);
        }).slice(0, 3);
        this.players[i].model.localMatrix = m4.lookAt(position, [0, 0, 0]); 
        this.players[i].position = position;
        count++;
      }
    }

    for (const card of player.cards) {
      // card.model.source.translation = [0, -10, -10];
      this.addModel(card.model);
    }
  }

  async addModel(model) {
    let size, type, normalise, stride, offset;
    let mipLevel, internalFormat, srcFormat, srcType;

    const geometry = await model.geometry;
    const [program, texProgram] = await this.programs;

    model.w.count = geometry.bufferData.length / model.dimensions;
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
      const imageUniformLocation = this.gl.getUniformLocation(model.w.program, "u_image");
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
      if (this.textures.includes(model.image)) model.w.textureUnit = this.textures.indexOf(model.image);
      else model.w.textureUnit = this.textureCount;

      // Set up texture
      const texture = this.gl.createTexture();
      this.gl.activeTexture(this.gl.TEXTURE0 + model.w.textureUnit);
      this.gl.bindTexture(this.gl.TEXTURE_2D, texture);

      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
      this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);

      mipLevel = 0;
      internalFormat = this.gl.RGBA;
      srcFormat = this.gl.RGBA;
      srcType = this.gl.UNSIGNED_BYTE;
      this.gl.texImage2D(this.gl.TEXTURE_2D, mipLevel, internalFormat, srcFormat, srcType, model.image);
      this.gl.generateMipmap(this.gl.TEXTURE_2D);

      if (model.w.textureUnit = this.textureCount) this.textureCount++;
    }


    const matrixUniformLocation = this.gl.getUniformLocation(model.w.program, "u_matrix");
    const positionAttribLocation = this.gl.getAttribLocation(model.w.program, "a_position");

    model.w.buffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, model.w.buffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(geometry.bufferData), this.gl.STATIC_DRAW);
    this.gl.bindVertexArray(model.w.vao);
    this.gl.enableVertexAttribArray(positionAttribLocation);
    size = model.dimensions;
    type = this.gl.FLOAT;
    normalise = false;
    stride = 0;
    offset = 0;
    this.gl.vertexAttribPointer(positionAttribLocation, size, type, normalise, stride, offset);

    model.w.uniforms.matrix = m4.yawRotation(Math.PI); // y is opposite way around for models
    model.w.uniformLocations.matrix = matrixUniformLocation;

    this.models.push(model);
  }

  removeModel(model) {
    if (this.models.includes(model)) this.models.splice(this.models.indexOf(model), 1);
  }

  async render() {
    if (this.gl === null) return null;

    this.resize();

    let then = 0;
    let dist = 0;

    const draw = now =>  {
      const timeDelta = now - then;
      then = now;

      dist += timeDelta * 0.0001;

      // Set up viewProjectionMatrix and player source matrices
      let cameraMatrix = m4.identity();
      const angleSeparation = Math.PI/28; // Separation of cards on circle around player.
      const cardDist = 18; // Radius of circle which cards lie on from the player.
      const horizon = -1; // How far cards are below horizon.
      for (const player of this.players) {
        const playerCameraMatrix = m4.lookAt(player.position, [0, 0, 0])
        player.model.localMatrix = playerCameraMatrix;
        if (player.mainPlayer) cameraMatrix = playerCameraMatrix;

        const numOfCards = player.cards.length;
        let count = 0;
        for (const card of player.cards) {
          card.model.source.translation[0] = cardDist * Math.sin((count - (numOfCards-1)/2) * angleSeparation);
          card.model.source.translation[2] = -cardDist * Math.cos((count - (numOfCards-1)/2) * angleSeparation);
          count++;
        }
      }

      const viewMatrix = m4.inverse(cameraMatrix);
      const projectionMatrix = m4.perspective(Math.PI / 3, this.gl.canvas.width/this.gl.canvas.height, 1, 10000);
      const viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);

      // Update card model matrices
      for (const model of this.models) {
        if (model.type === "card") {
          model.source.translation[1] = horizon;
          // Rotate card to face player. Small yaw adjustment (Math.PI/32) such that card faces show.
          model.source.rotation = [Math.acos(-horizon/cardDist), 0, -Math.atan(model.source.translation[0] / model.source.translation[2]) - Math.PI/32];
        }
      }

      // Prepare to draw
      this.origin.updateWorldMatrix();
      this.resize()
      this.gl.clearColor(0, 0, 0, 1);
      this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
      let previousProgram = null;
      let previousVao = null;


      // Draw models
      for (const model of this.models) {
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


          const worldMatrix = m4.multiply(model.worldMatrix, model.w.uniforms.matrix);
          const worldViewProjectionMatrix = m4.multiply(viewProjectionMatrix, worldMatrix);

          this.gl.uniformMatrix4fv(model.w.uniformLocations.matrix, false, worldViewProjectionMatrix);

          if (model.w.textureUnit !== undefined) this.gl.activeTexture(this.gl.TEXTURE0 + model.w.textureUnit);

          for (const uniform in model.w.uniforms) {
            if (uniform !== "matrix") {
              this.gl.uniform4fv(model.w.uniformLocations[uniform], model.w.uniforms[uniform]);
            }
          }

          let primitiveType = this.gl.TRIANGLES;
          let offset = 0;
          this.gl.drawArrays(primitiveType, offset, model.w.count);
        }
      }

      requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
  }

  resize() {
    const style = getComputedStyle(this.canvas);
    this.canvas.width = parseInt(style.width);
    this.canvas.height = parseInt(style.height);

    this.gl.canvas.width = this.canvas.width;
    this.gl.canvas.height = this.canvas.height;
    this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
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

export default Scene;
