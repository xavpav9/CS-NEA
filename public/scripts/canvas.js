import {m3, m4, v3} from "./linear-algebra.js";

async function main() {
  const canvas = document.querySelector("#c");
  const gl = canvas.getContext("webgl2");

  if (gl === null) return;

  const vsResponse = await fetch("../shaders/vs.glsl");
  const vsSource = await vsResponse.text();
  const vs = createShader(gl, gl.VERTEX_SHADER, vsSource);

  const fsResponse = await fetch("../shaders/fs.glsl");
  const fsSource = await fsResponse.text();
  const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource);

  const program = createProgram(gl, vs, fs);

  const colourUniformLocation = gl.getUniformLocation(program, "u_colour");
  const matrixUniformLocation = gl.getUniformLocation(program, "u_matrix");
  const positionAttribLocation = gl.getAttribLocation(program, "a_position");

  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    0, 0, 0,
    10, 0, 0,
    0, 10, 0,
  ]), gl.STATIC_DRAW);

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  gl.enableVertexAttribArray(positionAttribLocation);

  let size = 3;
  let type = gl.FLOAT;
  let normalise = false;
  let stride = 0;
  let offset = 0;

  gl.vertexAttribPointer(positionAttribLocation, size, type, normalise, stride, offset);

  resize();
  const cameraPosition = [0, 0, 0];
  const matrix = m4.yawRotation(Math.PI); // y is opposite way around for models

  let then = 0;
  let angle = 0;

  function draw(now) {
    const timeDelta = now - then;
    then = now;

    angle += timeDelta * 0.001;

    resize()

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);
    gl.useProgram(program);
    gl.bindVertexArray(vao);

    const worldMatrix = m4.translate(m4.roll(m4.pitch(m4.yaw(matrix, angle / 2), angle / 3), angle / 4), 0, 0, -30);
    const viewMatrix = m4.inverse(m4.translation(...cameraPosition));
    const projectionMatrix = m4.perspective(Math.PI / 3, gl.canvas.width/gl.canvas.height, 1, 10000);

    const viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);
    const worldViewProjectionMatrix = m4.multiply(viewProjectionMatrix, worldMatrix);

    gl.uniform4fv(colourUniformLocation, [1, 0, 0, 1]);
    gl.uniformMatrix4fv(matrixUniformLocation, false, worldViewProjectionMatrix);

    let primitiveType = gl.TRIANGLES;
    let offset = 0;
    let count = 3;
    gl.drawArrays(primitiveType, offset, count);

    requestAnimationFrame(draw);
  }

  function resize() {
    const style = getComputedStyle(canvas);
    canvas.width = parseInt(style.width);
    canvas.height = parseInt(style.height);

    gl.canvas.width = canvas.width;
    gl.canvas.height = canvas.height;
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  }


  requestAnimationFrame(draw);
}

function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);

  if (success) return shader;
  else {
    console.warn(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
  }
}

function createProgram(gl, vs, fs) {
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  const success = gl.getProgramParameter(program, gl.LINK_STATUS);

  if (success) return program;
  else {
    console.warn(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
  }
}

main();
