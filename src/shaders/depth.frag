#version 300 es

precision highp float;

#define saturate(x) clamp(x,0.,1.)
#define linearstep(a,b,x) saturate(((x)-(a))/((b)-(a)))

in vec4 vPosition;

out vec4 fragColor;

uniform vec2 cameraNearFar;
uniform vec3 cameraPos;

void main() {
  float depth = linearstep(
    cameraNearFar.x,
    cameraNearFar.y,
    length( cameraPos - vPosition.xyz )
  );
  fragColor = vec4( depth, depth * depth, depth, 1.0 );
}
