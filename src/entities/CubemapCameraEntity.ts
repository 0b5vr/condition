import { CUBEMAP_RESOLUTION } from '../config';
import { CubemapCamera } from '../heck/components/CubemapCamera';
import { CubemapRenderTarget } from '../heck/CubemapRenderTarget';
import { Entity } from '../heck/Entity';
import { LightEntity } from './LightEntity';

export interface CubemapCameraEntityOptions {
  scenes: Entity[];
  lights: LightEntity[];
}

export class CubemapCameraEntity extends Entity {
  public scenes: Entity[];
  public camera: CubemapCamera;
  public readonly target: CubemapRenderTarget;

  public constructor( options: CubemapCameraEntityOptions ) {
    super();

    this.scenes = options.scenes;

    this.target = new CubemapRenderTarget( {
      width: CUBEMAP_RESOLUTION[ 0 ],
      height: CUBEMAP_RESOLUTION[ 1 ],
    } );

    this.camera = new CubemapCamera( {
      scenes: options.scenes,
      renderTarget: this.target,
      near: 1.0,
      far: 20.0,
      materialTag: 'cubemap',
    } );
    this.components.push( this.camera );
  }
}
