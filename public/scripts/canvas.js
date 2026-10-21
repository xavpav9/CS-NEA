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
  const resolutionUniformLocation = gl.getUniformLocation(program, "u_resolution");
  const positionAttribLocation = gl.getAttribLocation(program, "a_position");

  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    0, 0,
    0, 10,
    10, 0,,
  ]), gl.STATIC_DRAW);

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  gl.enableVertexAttribArray(positionAttribLocation);

  let size = 2;
  let type = gl.FLOAT;
  let normalise = false;
  let stride = 0;
  let offset = 0;

  gl.vertexAttribPointer(positionAttribLocation, size, type, normalise, stride, offset);

  gl.canvas.width = canvas.width;
  gl.canvas.height = canvas.height;
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);


  let then = 0;

  function draw(now) {
    const timeDelta = now - then;


    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(program);
    gl.bindVertexArray(vao);

    gl.uniform4fv(colourUniformLocation, [1, 0, 0, 1]);
    gl.uniform2fv(resolutionUniformLocation, [gl.canvas.width, gl.canvas.height]);

    let primitiveType = gl.TRIANGLES;
    let offset = 0;
    let count = 3;
    gl.drawArrays(primitiveType, offset, count);

    requestAnimationFrame(draw);
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
