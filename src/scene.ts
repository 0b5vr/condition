import { Antialias } from './entities/Antialias';
import { Bloom } from './entities/Bloom';
import { BufferRenderTarget } from './heck/BufferRenderTarget';
import { CanvasRenderTarget } from './heck/CanvasRenderTarget';
import { Component, ComponentUpdateEvent } from './heck/components/Component';
import { Condition } from './entities/Condition';
import { Cube } from './entities/Cube';
import { CubemapCameraEntity } from './entities/CubemapCameraEntity';
import { DeferredCamera } from './entities/DeferredCamera';
import { Dog } from './heck/Dog';
import { Entity } from './heck/Entity';
import { EnvironmentMap } from './entities/EnvironmentMap';
import { FlashyTerrain } from './entities/FlashyTerrain';
import { FlickyParticles } from './entities/FlickyParticles';
import { ForwardCamera } from './entities/ForwardCamera';
import { Glitch } from './entities/Glitch';
import { IBLLUT } from './entities/IBLLUT';
import { IFSPistons } from './entities/IFSPistons';
import { Lambda } from './heck/components/Lambda';
import { LightEntity } from './entities/LightEntity';
import { PixelSorter } from './entities/PixelSorter';
import { Post } from './entities/Post';
import { RTInspector } from './entities/RTInspector';
import { Rings } from './entities/Rings';
import { Serial } from './entities/Serial';
import { SphereParticles } from './entities/SphereParticles';
import { SufferTexts } from './entities/SufferTexts';
import { Swap, Vector3 } from '@fms-cat/experimental';
import { Trails } from './entities/Trails';
import { Wobbleball } from './entities/Wobbleball';
import { arraySetDelete } from './utils/arraySetDelete';
import { auto, automaton } from './globals/automaton';
import { music } from './globals/music';
import { randomTexture } from './globals/randomTexture';

// -- dog ------------------------------------------------------------------------------------------
export const dog = new Dog();

const canvasRenderTarget = new CanvasRenderTarget();

// Mr. Update Everything
dog.root.components.push( new Lambda( {
  onUpdate: () => {
    if ( process.env.DEV ) {
      Component.gpuTimer!.update();
    }

    randomTexture.update();
    automaton.update( music.time );
  },
  name: process.env.DEV && 'main/update',
} ) );

// -- util -----------------------------------------------------------------------------------------
class EntityReplacer<T extends Entity> {
  private __root: Entity;
  public current!: T;
  public creator: () => T;

  public constructor( root: Entity, creator: () => T, name?: string ) {
    this.__root = root;
    this.creator = creator;
    this.replace();

    if ( name ) {
      auto( `${ name }/active`, ( { uninit } ) => {
        const entity = this.current;
        if ( entity ) {
          entity.active = !uninit;
          entity.visible = !uninit;
        }
      } );
    }
  }

  public replace(): void {
    if ( process.env.DEV ) {
      if ( this.current ) {
        arraySetDelete( this.__root.children, this.current );
      }
    }

    this.current = this.creator();
    this.__root.children.push( this.current );

    // not visible by default
    this.current.active = false;
    this.current.visible = false;
  }
}

// -- bake -----------------------------------------------------------------------------------------
const ibllut = new IBLLUT();
dog.root.children.push( ibllut.entity );

// -- deferred stuff -------------------------------------------------------------------------------
const deferredRoot = new Entity();
dog.root.children.push( deferredRoot );

const replacerSphereParticles = new EntityReplacer(
  deferredRoot,
  () => new SphereParticles(),
  'SphereParticles',
);
if ( process.env.DEV && module.hot ) {
  module.hot.accept( './entities/SphereParticles', () => {
    replacerSphereParticles.replace();
  } );
}

const replacerCondition = new EntityReplacer( deferredRoot, () => new Condition(), 'Condition' );
if ( process.env.DEV && module.hot ) {
  module.hot.accept( './entities/Condition', () => {
    replacerCondition.replace();
  } );
}

const replacerFlashyTerrain = new EntityReplacer(
  deferredRoot,
  () => new FlashyTerrain(),
  'FlashyTerrain',
);
if ( process.env.DEV && module.hot ) {
  module.hot.accept( './entities/FlashyTerrain', () => {
    replacerFlashyTerrain.replace();
  } );
}

const replacerTrails = new EntityReplacer( deferredRoot, () => new Trails(), 'Trails' );
if ( process.env.DEV && module.hot ) {
  module.hot.accept( './entities/Trails', () => {
    replacerTrails.replace();
  } );
}

const replacerRings = new EntityReplacer( deferredRoot, () => new Rings(), 'Rings' );
if ( process.env.DEV && module.hot ) {
  module.hot.accept( './entities/Rings', () => {
    replacerRings.replace();
  } );
}

const replacerCube = new EntityReplacer( deferredRoot, () => new Cube(), 'Cube' );
if ( process.env.DEV && module.hot ) {
  module.hot.accept( './entities/Cube', () => {
    replacerCube.replace();
  } );
}

const replacerFlickyParticles = new EntityReplacer(
  deferredRoot,
  () => new FlickyParticles(),
  'FlickyParticles',
);
if ( process.env.DEV && module.hot ) {
  module.hot.accept( './entities/FlickyParticles', () => {
    replacerFlickyParticles.replace();
  } );
}

const replacerWobbleball = new EntityReplacer( deferredRoot, () => new Wobbleball(), 'Wobbleball' );
if ( process.env.DEV && module.hot ) {
  module.hot.accept( './entities/Wobbleball', () => {
    replacerWobbleball.replace();
  } );
}

const replacerIFSPistons = new EntityReplacer( deferredRoot, () => new IFSPistons(), 'IFSPistons' );
if ( process.env.DEV && module.hot ) {
  module.hot.accept( './entities/IFSPistons', () => {
    replacerIFSPistons.replace();
  } );
}

// -- forward stuff --------------------------------------------------------------------------------
const forwardRoot = new Entity();
dog.root.children.push( forwardRoot );

const replacerSufferTexts = new EntityReplacer(
  forwardRoot,
  () => new SufferTexts(),
  'SufferTexts',
);
if ( process.env.DEV && module.hot ) {
  module.hot.accept( './entities/SufferTexts', () => {
    replacerSufferTexts.replace();
  } );
}

// -- things that is not an "object" ---------------------------------------------------------------
const swapOptions = {
  width: canvasRenderTarget.width,
  height: canvasRenderTarget.height
};

const swap = new Swap(
  new BufferRenderTarget( {
    ...swapOptions,
    name: process.env.DEV && 'main/postSwap0',
  } ),
  new BufferRenderTarget( {
    ...swapOptions,
    name: process.env.DEV && 'main/postSwap1',
  } ),
);

const replacerLightFirst = new EntityReplacer( dog.root, () => {
  const light = new LightEntity( {
    scenes: [ dog.root ],
    shadowMapFov: 90.0,
    shadowMapNear: 1.0,
    shadowMapFar: 20.0,
    namePrefix: process.env.DEV && 'lightFirst',
  } );
  light.color = [ 100.0, 100.0, 100.0 ];
  light.transform.lookAt( new Vector3( [ 4.0, 4.0, 4.0 ] ) );
  return light;
}, 'LightFirst' );
const lightFirst = replacerLightFirst.current;

const replacerLightPink = new EntityReplacer( dog.root, () => {
  const light = new LightEntity( {
    scenes: [ dog.root ],
    shadowMapFov: 90.0,
    shadowMapNear: 1.0,
    shadowMapFar: 20.0,
    namePrefix: process.env.DEV && 'lightPink',
  } );
  light.color = [ 120.0, 2.0, 10.0 ];
  light.transform.lookAt( new Vector3( [ -1.0, 2.0, 2.0 ] ) );
  return light;
}, 'LightPink' );
const lightPink = replacerLightPink.current;

if ( process.env.DEV && module.hot ) {
  module.hot.accept( './entities/LightEntity', () => {
    replacerLightFirst.replace();
    replacerLightPink.replace();
  } );
}

// const light2 = new LightEntity( {
//   root: dog.root,
//   shadowMapFov: 90.0,
//   shadowMapNear: 1.0,
//   shadowMapFar: 20.0,
//   namePrefix: process.env.DEV && 'light2',
// } );
// light2.color = [ 50.0, 30.0, 40.0 ];
// light2.transform.lookAt( new Vector3( [ -4.0, -2.0, 6.0 ] ) );
// dog.root.children.push( light2 );

const cubemapCamera = new CubemapCameraEntity( {
  scenes: [ dog.root ],
  lights: [
    lightFirst,
    lightPink,
    // light2
  ],
} );
dog.root.children.push( cubemapCamera );

const environmentMap = new EnvironmentMap( {
  cubemap: cubemapCamera.target,
} );
dog.root.children.push( environmentMap );

// -- camera ---------------------------------------------------------------------------------------
const cameraOnUpdate = ( { time }: ComponentUpdateEvent ): void => {
  const r = auto( 'Camera/rot/r' );
  const t = auto( 'Camera/rot/t' );
  const p = auto( 'Camera/rot/p' );
  const x = auto( 'Camera/pos/x' );
  const y = auto( 'Camera/pos/y' );
  const z = auto( 'Camera/pos/z' );
  const roll = auto( 'Camera/roll' );
  const shake = auto( 'Camera/shake' );

  const st = Math.sin( t );
  const ct = Math.cos( t );
  const sp = Math.sin( p );
  const cp = Math.cos( p );

  const wubPosAmp = 0.01;
  const wubPosTheta = 3.0 * time;
  const wubTarAmp = 0.02;
  const wubTarTheta = 4.21 * time;

  deferredCamera.transform.lookAt(
    new Vector3( [
      r * ct * sp + wubPosAmp * Math.sin( wubPosTheta ),
      r * st + wubPosAmp * Math.sin( 2.0 + wubPosTheta ),
      r * ct * cp + wubPosAmp * Math.sin( 4.0 + wubPosTheta ),
    ] ),
    new Vector3( [
      wubTarAmp * Math.sin( wubTarTheta ),
      wubTarAmp * Math.sin( 2.0 + wubTarTheta ),
      wubTarAmp * Math.sin( 4.0 + wubTarTheta ),
    ] ),
    undefined,
    0.02 * Math.sin( 2.74 * time ) + roll,
  );

  deferredCamera.transform.position = deferredCamera.transform.position.add(
    new Vector3( [ x, y, z ] )
  );

  if ( shake > 0.0 ) {
    deferredCamera.transform.position = deferredCamera.transform.position.add(
      new Vector3( [
        Math.sin( 145.0 * time ),
        Math.sin( 2.0 + 148.0 * time ),
        Math.sin( 4.0 + 151.0 * time )
      ] ).scale( shake )
    );
  }
};

const deferredCamera = new DeferredCamera( {
  scenes: [ deferredRoot ],
  target: swap.o,
  lights: [
    lightFirst,
    lightPink,
    // light2
  ],
  textureIBLLUT: ibllut.texture,
  textureEnv: environmentMap.texture,
} );

deferredCamera.components.unshift( new Lambda( {
  onUpdate: cameraOnUpdate,
  name: process.env.DEV && 'main/updateDeferredCamera',
} ) );
dog.root.children.push( deferredCamera );

const forwardCamera = new ForwardCamera( {
  scenes: [ forwardRoot ],
  target: swap.o,
  lights: [
    lightFirst,
    lightPink,
    // light2
  ],
} );

forwardCamera.components.unshift( new Lambda( {
  onUpdate: cameraOnUpdate,
  name: process.env.DEV && 'main/updateForwardCamera',
} ) );
dog.root.children.push( forwardCamera );

// -- post -----------------------------------------------------------------------------------------
swap.swap();
const antialias = new Antialias( {
  input: swap.i,
  target: swap.o
} );
dog.root.children.push( antialias );

swap.swap();
const bloom = new Bloom( {
  input: swap.i,
  target: swap.o
} );
dog.root.children.push( bloom );

swap.swap();
const glitch = new Glitch( {
  input: swap.i,
  target: swap.o,
} );
dog.root.children.push( glitch );

swap.swap();
const pixelSorter = new PixelSorter( {
  input: swap.i,
  target: swap.o,
} );
dog.root.children.push( pixelSorter );

swap.swap();
const serial = new Serial( {
  input: swap.i,
  target: swap.o,
} );
dog.root.children.push( serial );

swap.swap();
const post = new Post( {
  input: swap.i,
  target: canvasRenderTarget
} );
dog.root.children.push( post );

if ( process.env.DEV ) {
  const rtInspector = new RTInspector( {
    target: canvasRenderTarget
  } );
  dog.root.children.push( rtInspector );
}
