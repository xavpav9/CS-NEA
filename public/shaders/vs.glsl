#version 300 es

in vec2 a_position;

uniform mat3 u_matrix;
uniform vec4 u_colour;

out vec4 v_colour;

void main() {
  gl_Position = vec4(u_matrix * vec3(a_position, 1.0), 1.0);
  v_colour = u_colour;
}
