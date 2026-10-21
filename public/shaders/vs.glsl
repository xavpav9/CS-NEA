#version 300 es

in vec2 a_position;

uniform vec4 u_colour;
uniform vec2 u_resolution;

out vec4 v_colour;

void main() {
  vec2 zeroToOne = a_position / u_resolution;
  vec2 zeroToTwo = zeroToOne * 2.0;
  vec2 clipSpace = zeroToTwo - 1.0;

  gl_Position = vec4(clipSpace * vec2(1.0, -1.0), 0.0, 1.0);
  v_colour = u_colour;
}
