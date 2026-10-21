#version 300 es

precision highp float;

in vec4 v_colour;

out vec4 outColour;

void main() {
  outColour = v_colour;
}
