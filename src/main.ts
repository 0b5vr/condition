import { canvas } from './globals/canvas';
import { BufferRenderTarget } from './heck/BufferRenderTarget';
import { Component } from './heck/components/Component';
import { music } from './globals/music';
import { getCheckboxActive, getDivCanvasContainer } from './globals/dom';
import { dog } from './scene';
import { START_POSITION } from './config';

// == dom ==========================================================================================
document.body.style.margin = '0';
document.body.style.padding = '0';

if ( process.env.DEV ) {
  document.body.style.background = '#000';
  document.body.style.width = '100%';

  const divCanvasContainer = getDivCanvasContainer();

  divCanvasContainer.appendChild( canvas );
  ( canvas.style as any ).aspectRatio = 'auto 1920 / 1080';
  canvas.style.margin = 'auto';
  canvas.style.maxWidth = '100%';
  canvas.style.maxHeight = '100%';

  music.isPlaying = true;
  music.time = START_POSITION;
} else {
  canvas.style.position = 'fixed';
  canvas.style.left = '0';
  canvas.style.top = '0';
  document.body.style.width = canvas.style.width = '100%';
  document.body.style.height = canvas.style.height = '100%';

  const button = document.createElement( 'a' );
  document.body.appendChild( button );
  button.innerHTML = 'click me!';

  button.onclick = () => {
    document.body.appendChild( canvas );
    music.isPlaying = true;
    music.time = START_POSITION;
    document.body.requestFullscreen();
  };
}

// -- keyboards ------------------------------------------------------------------------------------
if ( process.env.DEV ) {
  const checkboxActive = getCheckboxActive();

  window.addEventListener( 'keydown', ( event ) => {
    if ( event.key === 'Escape' ) { // panic button
      dog.root.active = false;
      music.isPlaying = false;
      checkboxActive.checked = false;
    }
  } );

  checkboxActive.addEventListener( 'input', ( event: any ) => {
    dog.root.active = event.target.checked;
    music.isPlaying = event.target.checked;
  } );
}

if ( !process.env.DEV ) {
  window.addEventListener( 'keydown', ( event ) => {
    if ( event.key === 'Escape' ) { // panic button
      dog.root.active = false;
      music.isPlaying = false;
    }
  } );
}

// -- wenis ----------------------------------------------------------------------------------------
if ( process.env.DEV ) {
  console.info( Component.nameMap );
  console.info( BufferRenderTarget.nameMap );
}
