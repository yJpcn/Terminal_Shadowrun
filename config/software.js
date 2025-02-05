{
    /*
 This file contains the logic for custom software programs
 that perform more complex actions than just displaying some text or HTML.

 You are invited to edit this file to define your own commands!
 Start by removing the demo ones that you don't need for your game.

 Remember that function names must match the names of the programs in software.json.
 */
/* eslint-disable no-inner-declarations, no-nested-ternary, no-sequences, no-unused-vars */

/* function decrypt( args ) { // The same function can be used to encode text
    if ( args.length === 0 ) {
        return "<p>Some encrypted text must be provided: <code>decrypt 53CR3T T3XT</code></p>";
    }
    const textInClear = rot13( args.join( " " ) );
    return `<p class="hack-reveal">${ textInClear }</p>`;
}

}


function artifact( args ) {
    if ( args.length === 0 ) {
        return [ "<p>An ID must be provided: <code>artifact $id</code></p>", `You currently have access to the following artifacts: ${ Object.keys( DWEETS ).join( " " ) }` ];
    }
    const artifactId = args[ 0 ];
    const artifactDweet = DWEETS[ artifactId ];
    if ( !artifactDweet ) {
        return `You do not have access to the artifact with ID ${ artifactId }`;
    }
    return artifactDweet();
}
*/
}
