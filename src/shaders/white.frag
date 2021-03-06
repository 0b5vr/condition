#version 300 es

precision highp float;

const int MTL_UNLIT = 1;

in vec4 vPosition;
in vec3 vNormal;

layout (location = 0) out vec4 fragPosition;
layout (location = 1) out vec4 fragNormal;
layout (location = 2) out vec4 fragColor;
layout (location = 3) out vec4 fragWTF;

void main() {
  fragPosition = vPosition;
  fragNormal = vec4( vNormal, 1.0 );
  fragColor = vec4( 1.0 );
  fragWTF = vec4( vec3( 0.0, 0.0, 0.0 ), MTL_UNLIT );
}
