#version 300 es

precision highp float;

in vec4 v_colour;

uniform vec4 u_id;

out vec4 outColour;

void main() {
  outColour = u_id;
}
