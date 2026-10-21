#version 300 es

in vec4 a_position;

uniform mat4 u_matrix;
uniform vec4 u_colour;

out vec4 v_colour;

void main() {
  gl_Position = u_matrix * a_position;
  v_colour = u_colour;
}
