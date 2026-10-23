#version 300 es

layout (location = 0) in vec4 a_position;

uniform mat4 u_world;
uniform mat4 u_viewProjection;

void main() {
  gl_Position = u_viewProjection * u_world * a_position;
}
