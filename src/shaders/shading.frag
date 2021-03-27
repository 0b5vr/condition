#version 300 es

precision highp float;

const int MTL_NONE = 0;
const int MTL_UNLIT = 1;
const int MTL_PBR = 2;
const int MTL_GRADIENT = 3;
const int MTL_IRIDESCENT = 4;
const int AO_ITER = 8;
const float ENV_UV_MARGIN = 0.9375;
const float AO_BIAS = 0.0;
const float AO_RADIUS = 0.5;
const float PI = 3.14159265359;
const float TAU = 6.28318530718;
const float EPSILON = 1E-3;
const vec3 BLACK = vec3( 0.0 );
const vec3 DIELECTRIC_SPECULAR = vec3( 0.04 );
const vec3 ONE_SUB_DIELECTRIC_SPECULAR = 1.0 - DIELECTRIC_SPECULAR;

#define saturate(x) clamp(x,0.,1.)
#define linearstep(a,b,x) saturate(((x)-(a))/((b)-(a)))

vec4 seed;

in vec2 vUv;

out vec4 fragColor;

uniform vec2 lightNearFar;
uniform vec2 cameraNearFar;
uniform vec3 cameraPos;
uniform vec3 lightPos;
uniform vec3 lightColor;
uniform mat4 lightPV;
uniform mat4 cameraView;
uniform mat4 cameraPV;
uniform sampler2D sampler0; // position.xyz, depth
uniform sampler2D sampler1; // normal.xyz (yes, this is not good)
uniform sampler2D sampler2; // color.rgba (what is a though????)
uniform sampler2D sampler3; // materialParams.xyz, materialId
uniform sampler2D samplerShadow;
uniform sampler2D samplerIBLLUT;
uniform sampler2D samplerEnv;
uniform sampler2D samplerAo;
uniform sampler2D samplerRandom;

// == commons ======================================================================================
#pragma glslify: prng = require( ./-prng );
#pragma glslify: brdfLambert = require( ./modules/brdfLambert.glsl );
#pragma glslify: brdfSpecularGGX = require( ./modules/brdfSpecularGGX.glsl );
#pragma glslify: importanceSampleGGX = require( ./modules/importanceSampleGGX.glsl );

vec3 catColor( float _p ) {
  return 0.5 + 0.5 * vec3(
    cos( _p ),
    cos( _p + PI / 3.0 * 4.0 ),
    cos( _p + PI / 3.0 * 2.0 )
  );
}

vec3 blurpleGradient( float t ) {
  vec3 colorA = vec3( 0.01, 0.04, 0.2 );
  vec3 colorB = vec3( 0.02, 0.3, 0.9 );
  vec3 colorC = vec3( 0.9, 0.01, 0.6 );
  vec3 colorD = vec3( 0.5, 0.02, 0.02 );

  return mix(
    colorA,
    mix(
      colorB,
      mix(
        colorC,
        colorD,
        linearstep( 0.67, 1.0, t )
      ),
      linearstep( 0.33, 0.67, t )
    ),
    linearstep( 0.0, 0.33, t )
  );
}

vec4 sampleEnvNearest( vec2 uv, float lv ) {
  float p = pow( 0.5, float( lv ) );
  vec2 uvt = ENV_UV_MARGIN * ( uv - 0.5 ) + 0.5;
  uvt = mix( vec2( 1.0 - p ), vec2( 1.0 - 0.5 * p ), uvt );
  return texture( samplerEnv, uvt );
}

vec4 sampleEnvLinear( vec2 uv, float lv ) {
  return mix(
    sampleEnvNearest( uv, floor( lv ) ),
    sampleEnvNearest( uv, floor( lv + 1.0 ) ),
    fract( lv )
  );
}

// == structs ======================================================================================
struct Isect {
  vec2 screenUv;
  vec3 color;
  vec3 position;
  float depth;
  vec3 normal;
  int materialId;
  vec3 materialParams;
};

struct AngularInfo {
  vec3 V;
  vec3 L;
  vec3 H;
  float lenL;
  float lenV;
  float dotNV;
  float dotNL;
  float dotNH;
  float dotVH;
};

AngularInfo genAngularInfo( Isect isect ) {
  AngularInfo aI;
  aI.V = cameraPos - isect.position;
  aI.lenV = length( aI.V );
  aI.V = normalize( aI.V );

  aI.L = lightPos - isect.position;
  aI.lenL = length( aI.L );
  aI.L = normalize( aI.L );

  aI.H = normalize( aI.V + aI.L );
  aI.dotNV = clamp( dot( isect.normal, aI.V ), EPSILON, 1.0 );
  aI.dotNL = clamp( dot( isect.normal, aI.L ), EPSILON, 1.0 );
  aI.dotNH = clamp( dot( isect.normal, aI.H ), EPSILON, 1.0 );
  aI.dotVH = clamp( dot( aI.V, aI.H ), EPSILON, 1.0 );
  return aI;
}

// == features =====================================================================================
float castShadow( Isect isect, AngularInfo aI ) {
  float depth = linearstep( lightNearFar.x, lightNearFar.y, length( isect.position - lightPos ) );
  float bias = 0.0001 + 0.0001 * ( 1.0 - aI.dotNL );
  depth -= bias;

  vec4 proj = lightPV * vec4( isect.position, 1.0 );
  vec2 uv = proj.xy / proj.w * 0.5 + 0.5;

  vec4 tex = texture( samplerShadow, uv );

  float edgeClip = smoothstep( 0.4, 0.5, max( abs( uv.x - 0.5 ), abs( uv.y - 0.5 ) ) );

  float variance = saturate( tex.y - tex.x * tex.x );
  float md = depth - tex.x;
  float p = linearstep( 0.2, 1.0, variance / ( variance + md * md ) );

  float softShadow = md < 0.0 ? 1.0 : p;

  return mix(
    softShadow,
    1.0,
    edgeClip
  );
}

float calcDepth( vec3 pos ) {
  float dist = length( cameraPos - pos );
  float near = cameraNearFar.x;
  float far = cameraNearFar.y;
  return linearstep( near, far, dist );
}

// == shading functions ============================================================================
vec3 shadePBR( Isect isect, AngularInfo aI ) {
  // ref: https://github.com/KhronosGroup/glTF-Sample-Viewer/blob/master/src/shaders/metallic-roughness.frag

  float roughness = isect.materialParams.x;
  float metallic = isect.materialParams.y;
  float emissive = isect.materialParams.z;

  float shadow = castShadow( isect, aI );
  shadow = mix( 1.0, shadow, 0.8 );

  float ao = texture( samplerAo, isect.screenUv ).x;
  shadow *= ao;

  float decayL = 1.0 / ( aI.lenL * aI.lenL );

  vec3 albedo = mix( isect.color * ONE_SUB_DIELECTRIC_SPECULAR, vec3( 0.0 ), metallic );
  vec3 f0 = mix( DIELECTRIC_SPECULAR, isect.color, metallic );

  vec3 diffuse = brdfLambert( f0, albedo, aI.dotVH );
  vec3 spec = brdfSpecularGGX( f0, roughness, aI.dotVH, aI.dotNL, aI.dotNV, aI.dotNH );

  vec3 shade = PI * lightColor * decayL * shadow * aI.dotNL * ( diffuse + spec );

  vec3 color = shade;

#ifdef IS_FIRST_LIGHT

  // cheat the texture seam using noise!
  vec3 nEnvDiffuse = importanceSampleGGX( vec2( prng( seed ), prng( seed ) * 0.05 ), 2.0, isect.normal );

  // diffuse ibl
  vec2 uvEnvDiffuse = vec2(
    0.5 + atan( nEnvDiffuse.x, -nEnvDiffuse.z ) / TAU,
    0.5 + atan( nEnvDiffuse.y, length( nEnvDiffuse.zx ) ) / PI
  );
  vec3 texEnvDiffuse = sampleEnvNearest( uvEnvDiffuse, 4.0 ).rgb;
  color += ao * texEnvDiffuse * albedo;

  // reflective ibl
  vec3 reflEnvReflective = reflect( aI.V, isect.normal );
  vec2 uvEnvReflective = vec2(
    0.5 + atan( reflEnvReflective.x, -reflEnvReflective.z ) / TAU,
    0.5 + atan( reflEnvReflective.y, length( reflEnvReflective.zx ) ) / PI
  );
  vec2 brdfEnvReflective = texture( samplerIBLLUT, vec2( aI.dotNV, roughness ) ).xy;
  vec3 texEnvReflective = sampleEnvLinear( uvEnvReflective, 3.0 * roughness ).rgb;
  color += ao * texEnvReflective * ( brdfEnvReflective.x * f0 + brdfEnvReflective.y );

  // emissive
  color += emissive * aI.dotNV * isect.color;
#endif // IS_FIRST_LIGHT

  return color;

}

vec3 shadeGradient( Isect isect ) {
  vec3 ret;

#ifdef IS_FIRST_LIGHT
  float shade = isect.normal.y;
  ret = blurpleGradient( 0.5 + 0.5 * shade );
#else // IS_FIRST_LIGHT
  ret = vec3( 0.0 );
#endif // IS_FIRST_LIGHT

  return ret;
}

// == main procedure ===============================================================================
void main() {
  vec4 tex0 = texture( sampler0, vUv );
  vec4 tex1 = texture( sampler1, vUv );
  vec4 tex2 = texture( sampler2, vUv );
  vec4 tex3 = texture( sampler3, vUv );

  seed = texture( samplerRandom, vUv ) * 1919.810;
  prng( seed );

  Isect isect;
  isect.screenUv = vUv;
  isect.position = tex0.xyz;
  isect.depth = tex0.w;
  isect.normal = tex1.xyz;
  isect.color = tex2.rgb;
  isect.materialId = int( tex3.w + 0.5 );
  isect.materialParams = tex3.xyz;

  vec3 color = vec3( 0.0 );

  AngularInfo aI = genAngularInfo( isect );

  if ( isect.materialId == MTL_NONE ) {
    // do nothing

  } else if ( isect.materialId == MTL_UNLIT ) {
#ifdef IS_FIRST_LIGHT
    color = isect.color;
#endif

  } else if ( isect.materialId == MTL_PBR ) {
    color = shadePBR( isect, aI );

  } else if ( isect.materialId == MTL_GRADIENT ) {
    color = shadeGradient( isect );

  } else if ( isect.materialId == MTL_IRIDESCENT ) {
    isect.color *= mix(
      vec3( 1.0 ),
      catColor( isect.materialParams.x * aI.dotNV ),
      isect.materialParams.y
    );
    isect.materialParams = vec3( 0.1, isect.materialParams.z, 0.0 );
    color = shadePBR( isect, aI );

  }

  color *= exp( -0.4 * max( aI.lenV - 3.0, 0.0 ) );

#ifdef IS_FIRST_LIGHT
  // color = 0.5 + 0.5 * isect.normal;
  // color = vec3( calcDepth( tex0.xyz ) );
  // color = vec3( 0.5, 0.9, 0.6 ) * ( 1.0 - texture( samplerAo, isect.screenUv ).xyz );
  // color = vec3( 0.5, 0.9, 0.6 ) * ( texture( samplerAo, isect.screenUv ).xyz );
#endif
  // xfdA = shadeGradient( isect );

  fragColor = vec4( color, 1.0 );
  // fragColor.xyz *= smoothstep( 1.0, 0.7, calcDepth( tex0.xyz ) );
}
