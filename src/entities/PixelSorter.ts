import { Blit } from '../heck/components/Blit';
import { BufferRenderTarget } from '../heck/BufferRenderTarget';
import { Entity } from '../heck/Entity';
import { Material } from '../heck/Material';
import { Quad } from '../heck/components/Quad';
import { RenderTarget } from '../heck/RenderTarget';
import { Swap } from '@fms-cat/experimental';
import { auto } from '../globals/automaton';
import { dummyRenderTarget } from '../globals/dummyRenderTarget';
import { gl } from '../globals/canvas';
import { quadGeometry } from '../globals/quadGeometry';
import pixelSorterFrag from '../shaders/pixel-sorter.frag';
import pixelSorterIndexFrag from '../shaders/pixel-sorter-index.frag';
import quadVert from '../shaders/quad.vert';

export interface PixelSorterOptions {
  input: BufferRenderTarget;
  target: RenderTarget;
}

export class PixelSorter extends Entity {
  public swapBuffer: Swap<BufferRenderTarget>;

  public constructor( options: PixelSorterOptions ) {
    super();
    this.visible = false;

    const entityBypass = new Entity();
    entityBypass.visible = false;
    this.children.push( entityBypass );

    const entityMain = new Entity();
    entityMain.active = false;
    entityMain.visible = false;
    this.children.push( entityMain );

    if ( process.env.DEV ) {
      entityBypass.name = 'entityBypass';
      entityMain.name = 'entityMain';
    }

    this.swapBuffer = new Swap(
      new BufferRenderTarget( {
        width: options.target.width,
        height: options.target.height,
        name: process.env.DEV && 'PixelSorter/swap0',
        filter: gl.NEAREST,
      } ),
      new BufferRenderTarget( {
        width: options.target.width,
        height: options.target.height,
        name: process.env.DEV && 'PixelSorter/swap1',
        filter: gl.NEAREST,
      } ),
    );

    const bufferIndex = new BufferRenderTarget( {
      width: options.target.width,
      height: options.target.height,
      name: process.env.DEV && 'PixelSorter/index',
      filter: gl.NEAREST,
    } );

    // -- bypass -----------------------------------------------------------------------------------
    entityBypass.components.push( new Blit( {
      src: options.input,
      dst: options.target,
      name: process.env.DEV && 'blitBypass',
    } ) );

    // -- calc index -------------------------------------------------------------------------------
    let mul = 1;
    const indexMaterials: Material[] = [];

    while ( mul < options.target.width ) {
      const isLast = ( mul * 8 > options.target.width );

      const material = new Material(
        quadVert,
        pixelSorterIndexFrag,
        { initOptions: { geometry: quadGeometry, target: dummyRenderTarget } },
      );
      material.addUniform( 'mul', '1f', mul );
      material.addUniformTextures(
        'sampler0',
        options.input.texture,
      );
      material.addUniformTextures(
        'sampler1',
        this.swapBuffer.o.texture,
      );
      indexMaterials.push( material );

      entityMain.components.push( new Quad( {
        target: isLast ? bufferIndex : this.swapBuffer.i,
        material,
        name: process.env.DEV && `quadIndex-${ mul }`,
      } ) );

      this.swapBuffer.swap();

      mul *= 8;
    }

    // -- sort -------------------------------------------------------------------------------------
    let dir = 1.0 / 32.0;
    let comp = 1.0 / 32.0;
    const sortMaterials: Material[] = [];

    while ( dir < 1.0 ) {
      const isFirst = dir === 1.0 / 32.0;
      const isLast = ( dir === 0.5 ) && ( comp === 1.0 / 32.0 );

      const material = new Material(
        quadVert,
        pixelSorterFrag,
        { initOptions: { geometry: quadGeometry, target: dummyRenderTarget } },
      );
      material.addUniform( 'dir', '1f', dir );
      material.addUniform( 'comp', '1f', comp );
      material.addUniformTextures(
        'sampler0',
        ( isFirst ? options.input : this.swapBuffer.o ).texture,
      );
      material.addUniformTextures(
        'sampler1',
        bufferIndex.texture,
      );
      sortMaterials.push( material );

      entityMain.components.push( new Quad( {
        target: isLast ? options.target : this.swapBuffer.i,
        material,
        name: process.env.DEV && `quad-${ dir }-${ comp }`,
      } ) );

      this.swapBuffer.swap();

      if ( comp === 1.0 / 32.0 ) {
        dir *= 2.0;
        comp = dir;
      } else {
        comp /= 2.0;
      }
    }

    // -- update uniform ---------------------------------------------------------------------------
    auto( 'PixelSorter/amp', ( { value } ) => {
      indexMaterials.map( ( material ) => {
        material.addUniform( 'threshold', '1f', Math.abs( value ) );
      } );

      sortMaterials.map( ( material ) => {
        material.addUniform( 'reverse', '1i', ( value < 0.0 ) ? 1 : 0 );
      } );

      entityMain.active = 0.001 < Math.abs( value );
      entityBypass.active = !entityMain.active;
    } );
  }
}
