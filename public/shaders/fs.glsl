#version 300 es

precision highp float;

uniform vec4 u_colour;

out vec4 outColour;

void main() {
  outColour = u_colour;
}
