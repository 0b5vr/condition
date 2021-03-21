import type { FxDefinition } from '@fms-cat/automaton';

export const transpose: FxDefinition = {
  params: {
    note: { name: 'Note', type: 'float', default: 0.0 }
  },
  func( context ) {
    if ( context.init ) {
      context.state.v0 = context.value;
    }

    if ( context.index === context.i1 ) {
      context.setShouldNotInterpolate( true );
    }

    const { v0 } = context.state;
    return v0 + ( context.value - v0 ) * Math.pow( 2.0, context.params.note / 12.0 );
  }
};
