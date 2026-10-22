import {m3, m4, v3} from "./linear-algebra.js";

class Scene {
  constructor(canvas, players) {
    this.canvas = canvas;
    this.gl = this.canvas.getContext("webgl2");
    this.players = players;
    this.gameState = 0;
    this.animations = [];

    this.programs = (async () => {
      const vsResponse = await fetch("../shaders/vs.glsl");
      const vsSource = await vsResponse.text();
      const vs = this.createShader(this.gl.VERTEX_SHADER, vsSource);


      const fsResponse = await fetch("../shaders/fs.glsl");
      const fsSource = await fsResponse.text();
      const fs = this.createShader(this.gl.FRAGMENT_SHADER, fsSource);

      const program = this.createProgram(vs, fs);
      return [program];
    })();
  }

  /*
   * Funcs:
   * addPlayer(player);
   *
   * Animations: - Activated from player objects
   * pickUpCard(player, card);
   * placeDownCard(player, card);
   * changeGameState(number); // What the player should be doing (e.g. waiting, playing, selecting 3 cards, etc.)
   */

  async render() {
    if (this.gl === null) return null;

    const [program] = await this.programs;


    const colourUniformLocation = this.gl.getUniformLocation(program, "u_colour");
    const matrixUniformLocation = this.gl.getUniformLocation(program, "u_matrix");
    const positionAttribLocation = this.gl.getAttribLocation(program, "a_position");

    const positionBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
    
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([
      0, 0, 0,
      10, 0, 0,
      0, 10, 0,
    ]), this.gl.STATIC_DRAW);

    const vao = this.gl.createVertexArray();
    this.gl.bindVertexArray(vao);

    this.gl.enableVertexAttribArray(positionAttribLocation);

    let size = 3;
    let type = this.gl.FLOAT;
    let normalise = false;
    let stride = 0;
    let offset = 0;

    this.gl.vertexAttribPointer(positionAttribLocation, size, type, normalise, stride, offset);

    this.resize();

    const cameraPosition = [0, 0, 0];
    const matrix = m4.yawRotation(Math.PI); // y is opposite way around for models
    let angle = 0;
    let then = 0;

    const draw = now =>  {
      const timeDelta = now - then;
      then = now;

      angle += timeDelta * 0.001;

      this.resize()

      this.gl.clearColor(0, 0, 0, 0);
      this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

      this.gl.enable(this.gl.CULL_FACE);
      this.gl.enable(this.gl.DEPTH_TEST);
      this.gl.useProgram(program);
      this.gl.bindVertexArray(vao);

      const worldMatrix = m4.translate(m4.roll(m4.pitch(m4.yaw(matrix, angle / 2), angle / 3), angle / 4), 0, 0, -30);
      const viewMatrix = m4.inverse(m4.translation(...cameraPosition));
      const projectionMatrix = m4.perspective(Math.PI / 3, this.gl.canvas.width/this.gl.canvas.height, 1, 10000);

      const viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);
      const worldViewProjectionMatrix = m4.multiply(viewProjectionMatrix, worldMatrix);

      this.gl.uniform4fv(colourUniformLocation, [1, 0, 0, 1]);
      this.gl.uniformMatrix4fv(matrixUniformLocation, false, worldViewProjectionMatrix);

      let primitiveType = this.gl.TRIANGLES;
      let offset = 0;
      let count = 3;
      this.gl.drawArrays(primitiveType, offset, count);

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
