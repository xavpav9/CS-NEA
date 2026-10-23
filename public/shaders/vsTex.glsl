#version 300 es

in vec4 a_position;
in vec2 a_texcoord;
in vec4 a_normal;

uniform mat4 u_world;
uniform mat4 u_viewProjection;

out vec2 v_texcoord;
out vec4 v_normal;

void main() {
  gl_Position = u_viewProjection * u_world * a_position;
  v_texcoord = a_texcoord;
  v_normal = a_normal;
}
