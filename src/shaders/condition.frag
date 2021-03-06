#version 300 es

precision highp float;

const float RADIUS_CULL_SPHERE = 1.5;

const int MTL_UNLIT = 1;

#define saturate(i) clamp(i,0.,1.)
#define linearstep(a,b,x) saturate(((x)-(a))/((b)-(a)))

in float vScale;
in float vPhase;
in float vFade;
in vec3 vNormal;
in vec4 vPosition;
in vec4 vHuh;

#ifdef FORWARD
  out vec4 fragColor;
#endif

#ifdef DEFERRED
  layout (location = 0) out vec4 fragPosition;
  layout (location = 1) out vec4 fragNormal;
  layout (location = 2) out vec4 fragColor;
  layout (location = 3) out vec4 fragWTF;
#endif

#ifdef SHADOW
  out vec4 fragColor;

  uniform vec2 cameraNearFar;
  uniform vec3 cameraPos;
#endif

uniform float time;
uniform float phaseOffset;
uniform float phaseWidth;

void main() {
  float phase = fract( 2.0 * vPhase + vHuh.z + 0.1 * time + vHuh.y + phaseOffset / vScale );
  if ( phase > phaseWidth ) { discard; }

  float lenFromCenter = length( vPosition.xyz );
  if ( lenFromCenter < RADIUS_CULL_SPHERE ) { discard; }

  float colorPhase = exp( -4.0 * ( lenFromCenter - RADIUS_CULL_SPHERE ) );
  colorPhase = max( colorPhase, vFade );
  vec3 color = mix(
    vec3( 2.0 ),
    vec3( 0.0 ),
    colorPhase
  );

  #ifdef FORWARD
    fragColor = vec4( color, 1.0 );
  #endif

  #ifdef DEFERRED
    fragPosition = vPosition;
    fragNormal = vec4( vNormal, 1.0 );
    fragColor = vec4( color, 1.0 );
    fragWTF = vec4( vec3( 0.0, 0.0, 0.0 ), MTL_UNLIT );
  #endif

  #ifdef SHADOW
    float depth = linearstep(
      cameraNearFar.x,
      cameraNearFar.y,
      length( cameraPos - vPosition.xyz )
    );
    fragColor = vec4( depth, depth * depth, depth, 1.0 );
  #endif
}
