#version 300 es

precision highp float;

in vec2 v_texcoord;

uniform sampler2D u_image;

out vec4 outColour;

void main() {
  outColour = texture(u_image, v_texcoord);
}
