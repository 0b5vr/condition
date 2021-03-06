import { Entity } from '../heck/Entity';
import { GPUParticles } from './GPUParticles';
import { InstancedGeometry } from '../heck/InstancedGeometry';
import { Material } from '../heck/Material';
import { dummyRenderTarget, dummyRenderTargetFourDrawBuffers, dummyRenderTargetTwoDrawBuffers } from '../globals/dummyRenderTarget';
import { genOctahedron } from '../geometries/genOctahedron';
import { glCat } from '../globals/canvas';
import { quadGeometry } from '../globals/quadGeometry';
import { randomTexture, randomTextureStatic } from '../globals/randomTexture';
import depthFrag from '../shaders/depth.frag';
import quadVert from '../shaders/quad.vert';
import sphereParticleComputeFrag from '../shaders/sphere-particles-compute.frag';
import sphereParticleRenderFrag from '../shaders/sphere-particles-render.frag';
import sphereParticleRenderVert from '../shaders/sphere-particles-render.vert';

const PARTICLES_SQRT = 256;
const PARTICLES = PARTICLES_SQRT * PARTICLES_SQRT;

export class SphereParticles extends Entity {
  public constructor() {
    super();

    // -- material compute -------------------------------------------------------------------------
    const materialCompute = new Material(
      quadVert,
      sphereParticleComputeFrag,
      { initOptions: { geometry: quadGeometry, target: dummyRenderTargetTwoDrawBuffers } },
    );

    materialCompute.addUniform( 'particlesSqrt', '1f', PARTICLES_SQRT );
    materialCompute.addUniform( 'particles', '1f', PARTICLES );
    materialCompute.addUniformTextures( 'samplerRandom', randomTexture.texture );

    if ( process.env.DEV ) {
      if ( module.hot ) {
        module.hot.accept( '../shaders/sphere-particles-compute.frag', () => {
          materialCompute.replaceShader( quadVert, sphereParticleComputeFrag );
        } );
      }
    }

    // -- geometry render --------------------------------------------------------------------------
    const octahedron = genOctahedron( { radius: 1.0, div: 1 } );

    const geometryRender = new InstancedGeometry();

    geometryRender.vao.bindVertexbuffer( octahedron.position, 0, 3 );
    geometryRender.vao.bindVertexbuffer( octahedron.normal, 1, 3 );
    geometryRender.vao.bindIndexbuffer( octahedron.index );

    const bufferComputeUV = glCat.createBuffer();
    bufferComputeUV.setVertexbuffer( ( () => {
      const ret = new Float32Array( PARTICLES * 2 );
      for ( let iy = 0; iy < PARTICLES_SQRT; iy ++ ) {
        for ( let ix = 0; ix < PARTICLES_SQRT; ix ++ ) {
          const i = ix + iy * PARTICLES_SQRT;
          const s = ( ix + 0.5 ) / PARTICLES_SQRT;
          const t = ( iy + 0.5 ) / PARTICLES_SQRT;
          ret[ i * 2 + 0 ] = s;
          ret[ i * 2 + 1 ] = t;
        }
      }
      return ret;
    } )() );

    geometryRender.vao.bindVertexbuffer( bufferComputeUV, 2, 2, 1 );

    geometryRender.count = octahedron.count;
    geometryRender.mode = octahedron.mode;
    geometryRender.indexType = octahedron.indexType;
    geometryRender.primcount = PARTICLES_SQRT * PARTICLES_SQRT;

    // -- material render --------------------------------------------------------------------------
    const deferred = new Material(
      sphereParticleRenderVert,
      sphereParticleRenderFrag,
      {
        defines: [ 'DEFERRED 1' ],
        initOptions: { geometry: geometryRender, target: dummyRenderTargetFourDrawBuffers },
      },
    );

    const depth = new Material(
      sphereParticleRenderVert,
      depthFrag,
      { initOptions: { geometry: geometryRender, target: dummyRenderTarget } },
    );

    const materialsRender = { deferred, depth };

    deferred.addUniformTextures( 'samplerRandomStatic', randomTextureStatic.texture );
    depth.addUniformTextures( 'samplerRandomStatic', randomTextureStatic.texture );

    if ( process.env.DEV ) {
      if ( module.hot ) {
        module.hot.accept(
          [
            '../shaders/sphere-particles-render.vert',
            '../shaders/sphere-particles-render.frag',
          ],
          () => {
            deferred.replaceShader( sphereParticleRenderVert, sphereParticleRenderFrag );
            depth.replaceShader( sphereParticleRenderVert, depthFrag );
          }
        );
      }
    }

    // -- gpu particles ----------------------------------------------------------------------------
    const gpuParticles = new GPUParticles( {
      materialCompute,
      geometryRender,
      materialsRender,
      computeWidth: PARTICLES_SQRT,
      computeHeight: PARTICLES_SQRT,
      computeNumBuffers: 2,
      brtNamePrefix: process.env.DEV && this.name,
    } );
    this.children.push( gpuParticles );
  }
}
