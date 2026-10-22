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
    this.cameraPosition = [0, 50, 30];
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
    model.worldViewProjectionMatrix = m4.identity();

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

      const texture = this.gl.createTexture();
      this.gl.activeTexture(this.gl.TEXTURE0 + this.textureCount);
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

      model.w.textureUnit = this.textureCount;
      this.textureCount++;
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

    const draw = now =>  {
      const timeDelta = now - then;
      then = now;

      // Calculate moving object values
      this.cameraPosition[0] += timeDelta * 0.01;

      // Set up viewProjectionMatrix
      const cameraMatrix = m4.lookAt(this.cameraPosition, [0, 0, 0], [0, 1, 0])
      for (const player of this.players) player.model.localMatrix = cameraMatrix;
      const viewMatrix = m4.inverse(cameraMatrix);
      const projectionMatrix = m4.perspective(Math.PI / 3, this.gl.canvas.width/this.gl.canvas.height, 1, 10000);
      const viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);

      // Update model matrices
      for (const model of this.models) {
        model.source.translation = [0, 0, -15];
        model.source.rotation = [Math.PI/2, 0, 0];

        const worldMatrix = m4.multiply(model.worldMatrix, model.w.uniforms.matrix);
        model.worldViewProjectionMatrix = m4.multiply(viewProjectionMatrix, worldMatrix);
      }

      // Prepare to draw
      this.origin.updateWorldMatrix();
      this.resize()
      this.gl.clearColor(0, 0, 0, 1);
      this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);


      // Draw models
      for (const model of this.models) {
        this.gl.enable(this.gl.CULL_FACE);
        this.gl.cullFace(this.gl.BACK);
        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.useProgram(model.w.program);
        this.gl.bindVertexArray(model.w.vao);

        this.gl.uniformMatrix4fv(model.w.uniformLocations.matrix, false, model.worldViewProjectionMatrix);

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
