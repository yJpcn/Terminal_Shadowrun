// Global scope variables
const defaultServerAddress = "10.14.8.10.14.7.10.safenet";
let serverDatabase = {};
let userDatabase = {};
let userList = [];
let mailList = [];
let cmdLine_;
let output_;
let serverDate = { day: "", month: "", year: "", reference: "" };

function initDateObject() {
    const date = new Date();
    const day = serverDatabase.day ? serverDatabase.day : date.getDate();
    const month = serverDatabase.month ? serverDatabase.month : date.getMonth() + 1;
    const year = serverDatabase.year ? serverDatabase.year : date.getFullYear();
    const reference = serverDatabase.reference ? serverDatabase.reference : "";
    serverDate = { day, month, year, reference };
}

function debugObject( obj ) {
    for ( const property in obj ) {
        console.log( `${ property }: ${ JSON.stringify( obj[ property ] ) }` );
        output( `${ property }: ${ JSON.stringify( obj[ property ] ) }` );
    }
}

/**
 * Set Header and Prompt informations.
 *
 * This function is useful to avoid code repetition.
 *
 * @param {String} msg A message to be showed when done
 */
function setHeader( msg ) {
    // Setting correct header icon and terminal name
    const promptText = `[${ userDatabase.userName }@${ serverDatabase.terminalID }] # `;

    initDateObject();
    const dateStr = `${ serverDate.day }/${ serverDate.month }/${ serverDate.year }`;
    const imgUrl = `config/network/${ serverDatabase.serverAddress }/${ serverDatabase.iconName }`;
    //const imgSize = serverDatabase.iconSize || 300;
    const header = `
    <img src="${ imgUrl }" width="${ 256 }" height="${ 256 }"
         style="float: left; padding-right: 10px" class="${ serverDatabase.iconClass || "" }">
    <h2 style="letter-spacing: 4px">${ serverDatabase.serverName }</h2>
    <p>Você está conectado à: ${ serverDatabase.serverAddress } <br> 
    (&nbsp;${ dateStr }&nbsp;) </p>
    ${ serverDatabase.headerExtraHTML || "" }
    <p> Conexão segura estabelecida; Serpens in hac silva caecus est. </p>
    `;
    // Clear content:
    output_.innerHTML = "";
    cmdLine_.value = "";
    if ( term ) {
        term.loadHistoryFromLocalStorage( serverDatabase.initialHistory );
    }
    output( [ header, msg ] ).then( () => applySFX() );
    $( ".prompt" ).html( promptText );
}

/**
 * Cross-browser impl to get document's height.
 *
 * This function is necessary to auto-scroll to the end of page after each terminal command.
 */
function getDocHeight_() {
    const doc = document;
    return Math.max(
        Math.max( doc.body.scrollHeight, doc.documentElement.scrollHeight ),
        Math.max( doc.body.offsetHeight, doc.documentElement.offsetHeight ),
        Math.max( doc.body.clientHeight, doc.documentElement.clientHeight )
    );
}

/**
 * Scroll to bottom and clear the input value for a new line.
 */
function newLine() {
    window.scrollTo( 0, getDocHeight_() );
    cmdLine_.value = ""; // Clear/setup line for next input.
}

/**
 * Display content as terminal output.
 *
 * @param {String} data The string to be returned as a print in terminal
 * @param {Array} data The array to be returned as a print in terminal
 */
function output( data ) {
    return new Promise( ( resolve ) => {
        let delayed = 0;

        if ( data && data.constructor === Object ) {
            delayed = data.delayed;
            data = data.text;
        }

        if ( data && data.constructor === Array ) {
            if ( delayed && data.length > 0 ) {
                outputLinesWithDelay( data, delayed, () => resolve( newLine() ) );
                return;
            }
            $.each( data, ( _, value ) => {
                printLine( value );
            } );
        } else if ( data ) {
            printLine( data );
        }
        resolve( newLine() );
    } );
}

/**
 * Print lines of content with some delay between them.
 *
 * @param {Array} lines list of content to display
 * @param {Number} delayed delay in milliseconds between which to display lines
 */
function outputLinesWithDelay( lines, delayed, resolve ) {
    const line = lines.shift();
    printLine( line );
    if ( lines.length > 0 ) {
        setTimeout( outputLinesWithDelay, delayed, lines, delayed, resolve );
    } else if ( resolve ) {
        resolve();
    }
}

/**
 * Display some text, or an image, on a new line.
 *
 * @param {String} data text to display
 * @param {Object} data information on what to display
 */
function printLine( data ) {
    data ||= "";
    if ( !data.startsWith( "<" ) ) {
        data = `<p>${ data }</p>`;
    }
    output_.insertAdjacentHTML( "beforeEnd", data );
    applySFX();
}

function applySFX() {
    $( output_ ).find( ".desync" ).each( ( _, elem ) => {
        const text = elem.textContent.trim();
        if ( text ) {
            elem.dataset.text = text;
        }
    } );
    $( output_ ).find( "img.glitch" ).filter( once ).each( ( _, img ) => glitchImage( img ) );
    $( output_ ).find( "img.particle" ).filter( once ).each( ( _, img ) => particleImage( img ) );
    $( output_ ).find( ".hack-reveal" ).filter( once ).each( ( _, elem ) => hackRevealText( elem, elem.dataset ) );
}

function once( _, elem ) {
    if ( elem.dataset.marked ) {
        return false;
    }
    elem.dataset.marked = true;
    return true;
}

/**
 * The Kernel will handle all software (system calls).
 *
 * The app name will be checked first if it exists as a system 'native' command.
 * If it doesn't, it will look for a custom software defined at software.json.
 *
 * You can define commands with filetypes by naming the function as command_type.
 * The kernel will handle every `.` as a `_` when looking for the correct software.
 * i.e. the `bar_exe` function needs to be called as the `bar.exe` command in the Terminal.
 *
 * @param {String} app The app name
 * @param {Array} args A list of Strings as args
 */
function kernel( appName, args ) {
    const program = allowedSoftwares()[ appName ];
    if ( program ) {
        return software( appName, program, args );
    }
    const systemApp = system[ appName ] || system[ appName.replace( ".", "_" ) ];
    const appDisabled = ( program === null );
    if ( !systemApp || appDisabled ) {
        return Promise.reject( new CommandNotFoundError( appName ) );
    }
    return systemApp( args );
}

/**
 * Attempts to connect to a server.
 * If successful, sets global variables serverDatabase / userDatabase / userList / mailList
 */
kernel.connectToServer = function connectToServer( serverAddress, userName, passwd ) {
    return new Promise( ( resolve, reject ) => {
        if ( serverAddress === serverDatabase.serverAddress ) {
            reject( new AlreadyOnServerError( serverAddress ) );
            return;
        }
        $.get( `config/network/${ serverAddress }/manifest.json`, ( serverInfo ) => {
            if ( !userName && serverInfo.defaultUser ) {
                serverDatabase = serverInfo;
                userDatabase = serverInfo.defaultUser;
                $.get( `config/network/${ serverInfo.serverAddress }/userlist.json`, ( users ) => {
                    userList = users;
                } );
                $.get( `config/network/${ serverInfo.serverAddress }/mailserver.json`, ( mails ) => {
                    mailList = mails;
                } );
                setHeader( "Usuário anônimo detectado; caso seja novo aqui, use o comando 'intro' para mais informações." );
                resolve();
            } else if ( userName ) {
                $.get( `config/network/${ serverInfo.serverAddress }/userlist.json`, ( users ) => {
                    const matchingUser = users.find( ( user ) => user.userId === userName );
                    if ( !matchingUser ) {
                        reject( new UnknownUserError( userName ) );
                        return;
                    }
                    if ( matchingUser.password && matchingUser.password !== passwd ) {
                        reject( new InvalidPasswordError( userName ) );
                        return;
                    }
                    serverDatabase = serverInfo;
                    userDatabase = matchingUser;
                    userList = users;
                    $.get( `config/network/${ serverInfo.serverAddress }/mailserver.json`, ( mails ) => {
                        mailList = mails;
                    } );
                    setHeader( "Connection successful" );
                    resolve();
                } ).fail( () => {
                    reject( new AddressNotFoundError( serverAddress ) );
                } );
            } else {
                reject( new ServerRequireUsernameError( serverAddress ) );
            }
        } ).fail( ( ...args ) => {
            console.error( "[connectToServer] Failure:", args );
            reject( new AddressNotFoundError( serverAddress ) );
        } );
    } );
};

/**
 * This will initialize the kernel function.
 *
 * It will define the help functions, set some important variables and connect the databases.
 *
 * @param {Object} cmdLineContainer The Input.cmdline right of the div.prompt
 * @param {Object} outputContainer The output element inside the div#container
 */
kernel.init = function init( cmdLineContainer, outputContainer ) {
    return new Promise( ( resolve, reject ) => {
        cmdLine_ = document.querySelector( cmdLineContainer );
        output_ = document.querySelector( outputContainer );

        $.when(
            $.get( "config/software.json", ( softwareData ) => {
                softwareInfo = softwareData;
                kernel.connectToServer( defaultServerAddress );
            } )
        )
            .done( () => {
                resolve( true );
            } )
            .fail( ( err, msg, details ) => {
                console.error( "[init] Failure:", err, msg, details );
                reject( new JsonFetchParseError( msg ) );
            } );
    } );
};

/**
 * Internal command functions.
 *
 * This is where the internal commands are located.
 * This should have every non-custom software command functions.
 */
system = {
    dumpdb() {
        return new Promise( () => {
            output( ":: serverDatabase - connected server information" );
            debugObject( serverDatabase );
            output( "----------" );
            output( ":: userDatabase - connected user information" );
            debugObject( userDatabase );
            output( "----------" );
            output( ":: userList - list of users registered in the connected server" );
            debugObject( userList );
        } );
    },

    quemsoueu() {
        return new Promise( ( resolve ) => {
            resolve(
                `${ "Anhangá" }/${ userDatabase.userId }`
            );
        } );
    },

    limpar() {
        return new Promise( ( resolve ) => {
            setHeader();
            resolve( false );
        } );
    },

    data() {
        return new Promise( ( resolve ) => {
            const date = new Date();
            const time = `${ date.getHours() }:${ date.getMinutes() }:${ date.getSeconds() }`;
            resolve( String( `${ serverDate.month } ${ serverDate.day } ${ serverDate.year } ${ time } ${ serverDate.reference }` ) );
        } );
    },

    
    intro() {
        return new Promise( ( resolve ) => {
            output("Eu não te conheço, nem você me conhece. Que permaneça assim.");
            output("Esse dispositivo e a rede a qual ele conecta existem porque informação é poder, e há muito tempo tem informação demais nas mãos das pessoas erradas. As ruas sussurram, as corporações escutam, e o Grande Dragão segura o que resta da Pátria pelos ovos."); 
            output("Se você quer continuar sendo runner, você precisa de lugares onde até ele não chega. Como a minha conexão.");
            output("Não sei quem te entregou esse terminal. Talvez um amigo, ou um contato, ou alguém que você não deva confiar. Não me importa. Eu apenas forneço as ferramentas. Como você usa, é com você.");
            output("Se você não sabe o que fazer, use o comando ajuda. Ou então dá uma olhada na caixa. Vai que quem te mandou isso aqui teve a decência de deixar uma mensagem primeiro.");
            output("Ut supra, ut infra.");
            output("— Anhangá")
        } );
    },

    ajuda( args ) {
        return new Promise( ( resolve ) => {
            const programs = allowedSoftwares();
            if ( args.length === 0 ) {
                const cmdNames = Object.keys( system ).filter(
                    ( cmd ) => {
                        const program = programs[ cmd ];
                        return program !== null && !( program && program.secretCommand ) && cmd !== "dumpdb"; // hidden system command
                    }
                );
                const progNames = Object.keys( programs ).filter(
                    ( pName ) => programs[ pName ] && !programs[ pName ].secretCommand
                );
                Array.prototype.push.apply( cmdNames, progNames );
                cmdNames.sort();
                resolve( [
                    "Quer ajuda? Já está melhor do que a maioria dos runners. Digite ajuda seguido de um comando para saber mais.",
                    "De todo jeito, aqui estão os comandos que você tem acesso atualmente:",
                    `<div class="ls-files">${ cmdNames.join( "<br>" ) }</div>`,
                ] );
            } else if ( args[ 0 ] === "limpar" ) {
                resolve( [ "Limpa o terminal. Não seu passado, infelizmente." ] );
            } else if ( args[ 0 ] === "data" ) {
                resolve( [ "Mostra a data. Não sei o que você esperava." ] );
            } /*else if ( args[ 0 ] === "echo" ) {
                resolve( [ "Usagem:", "> echo 'xxx'", "Repete a entrada que segue o comando." ] );
            }*/ else if ( args[ 0 ] === "ajuda" ) {
                resolve( [ "Você sabe o que isso aqui faz." ] );
            } /*else if ( args[ 0 ] === "history" ) {
                resolve( [ "Usagem:", "> history", "The history command will list all the commands you alread typed in this terminal." ] );
            }*/ else if ( args[ 0 ] === "login" ) {
                resolve( [ "Logga você em sua conta; use usuário:senha. Se não tem credenciais ainda, provavelmente vai receber se voltar vivo do seu primeiro trabalho. Um grande se." ] );
            } else if ( args[ 0 ] === "caixa" ) {
                resolve( [ "Sua caixa de mensagens; lida com o comando ler. Cheque sempre. Exceto se você gosta de perder dinheiro e viver em baixo de uma pedra." , "Não sou sua babá." ] );
            } else if ( args[ 0 ] === "ping" ) {
                resolve( [
                    "Checa se um endereço existe; digite ping endereço. Se teve uma resposta, parabéns, alguém tá ouvindo. Se não... Bem, ou você foi enganado, ou você é o próximo."
                ] );
            } else if ( args[ 0 ] === "ler" ) {
                resolve( [ "Lê uma mensagem da sua caixa. Escreva ler e o número à esquerda da mensagem pra a abrir; como 'ler 0', ou 'ler 1'. Pode ser um trabalho. Ou uma ameaça de morte. Não fazemos pré-checagem." ] );
            } else if ( args[ 0 ] === "conectar" ) {
                resolve( [
                    "Use conectar [endereço] para se conectar para o endereço que seja que seu contato tenha lhe passado. Se você recebeu um login, talvez até uma senha, use conectar usuario@endereço ou conectar usuario:senha@endereço.", "Tenha certeza que tá conectando para o lugar certo. O lugar errado talvez conecte de volta."
                ] );
            } else if ( args[ 0 ] === "quemsoueu" ) {
                resolve( [ "Mostra sua conexão e login atual. Se é sua primeira aqui, provavelmente está em acesso anônimo. Talvez isso mude." ] );
            } 
              else if ( args[ 0 ] === "sair" ) {
                resolve( [ "Disconecta você do server atual. Te traz de volta pra mim. Espero que achou o que procurava." ] );
            }
            else if ( args[ 0 ] === "logout" ) {
                resolve( [ "Te desloga da conta atual. Às vezes, desaparecer é a melhor opção." ] );
            }else if ( args[ 0 ] in softwareInfo ) {
                const customProgram = programs[ args[ 0 ] ];
                if ( customProgram.ajuda ) {
                    resolve( [ "Usage:", `> ${ args[ 0 ] }`, customProgram.ajuda ] );
                }
            } else if ( args[ 0 ] in system && args[ 0 ] !== "dumpdb" ) {
                console.error( `Missing help message for system command: ${ args[ 0 ] }` );
            } else {
                resolve( [ `Comando desconhecido ${ args[ 0 ] }; certeza que digitou o comando certo?` ] );
            }
        } );
    },

    login( args ) {
        return new Promise( ( resolve, reject ) => {
            if ( !args ) {
                reject( new UsernameIsEmptyError() );
                return;
            }
            let userName = "";
            let passwd = "";
            try {
                [ userName, passwd ] = userPasswordFrom( args[ 0 ] );
            } catch ( error ) {
                reject( error );
                return;
            }
            if ( !userName ) {
                reject( new UsernameIsEmptyError() );
                return;
            }
            const matchingUser = userList.find( ( user ) => user.userId === userName );
            if ( !matchingUser ) {
                reject( new UnknownUserError( userName ) );
                return;
            }
            if ( matchingUser.password && matchingUser.password !== passwd ) {
                reject( new InvalidPasswordError( userName ) );
                return;
            }
            userDatabase = matchingUser;
            setHeader( "Login successful" );
            resolve();
        } );
    },

    logout() {
        return new Promise( () => {
            location.reload();
        } );
    },

    sair() {
        return new Promise( () => {
            location.reload();
        } );
    },

    /*history() {
        return new Promise( ( resolve ) => {
            const messageList = history_.map( ( line, i ) => `[${ i }] ${ line }` ); // eslint-disable-line no-undef
            resolve( messageList );
        } );
    },*/

    caixa() {
        return new Promise( ( resolve, reject ) => {
            const messageList = mailList.filter( ( mail ) => mail.to.includes( userDatabase.userId ) )
                .map( ( mail, i ) => `[${ i }] ${ mail.title }` );
            if ( messageList.length === 0 ) {
                reject( new MailServerIsEmptyError() );
                return;
            }
            resolve( messageList );
        } );
    },

    ler( args ) {
        return new Promise( ( resolve, reject ) => {
            const mailIndex = Number( args[ 0 ] );
            const mailAtIndex = mailList[ mailIndex ];
            if ( !mailAtIndex || !mailAtIndex.to.includes( userDatabase.userId ) ) {
                reject( new InvalidMessageKeyError() );
                return;
            }
            let message = [];
            message.push( "---------------------------------------------" );
            message.push( `From: ${ mailAtIndex.from }` );
            message.push( `To: ${ userDatabase.userId }@${ serverDatabase.terminalID }` );
            message.push( "---------------------------------------------" );
            message = [ ...message, ...mailAtIndex.body.split( "  " ) ];
            resolve( message );
        } );
    },

    ping( args ) {
        return new Promise( ( resolve, reject ) => {
            if ( args === "" ) {
                reject( new AddressIsEmptyError() );
                return;
            }

            $.get( `config/network/${ args }/manifest.json`, ( serverInfo ) => {
                resolve( `Server ${ serverInfo.serverAddress } (${ serverInfo.serverName }) can be reached` );
            } )
                .fail( () => reject( new AddressNotFoundError( args ) ) );
        } );
    },

    /*telnet() {
        return new Promise( ( _, reject ) => {
            reject( new Error( "telnet is unsecure and is deprecated - use ssh instead" ) );
        } );
    },*/

    conectar( args ) {
        return new Promise( ( resolve, reject ) => {
            if ( args === "" ) {
                reject( new AddressIsEmptyError() );
                return;
            }
            let userName = "";
            let passwd = "";
            let serverAddress = args[ 0 ];
            if ( serverAddress.includes( "@" ) ) {
                const splitted = serverAddress.split( "@" );
                if ( splitted.length !== 2 ) {
                    reject( new InvalidCommandParameter( "conectar" ) );
                    return;
                }
                serverAddress = splitted[ 1 ];
                try {
                    [ userName, passwd ] = userPasswordFrom( splitted[ 0 ] );
                } catch ( error ) {
                    reject( error );
                    return;
                }
            }
            kernel.connectToServer( serverAddress, userName, passwd ).then( resolve ).catch( reject );
        } );
    }
};

function userPasswordFrom( creds ) {
    if ( !creds.includes( ":" ) ) {
        return [ creds, "" ];
    }
    const splitted = creds.split( ":" );
    if ( splitted.length !== 2 ) {
        throw new InvalidCredsSyntaxError();
    }
    return splitted;
}

/**
 * The custom software caller.
 *
 * This will look for custom softwares from `software.json`.
 *
 * @param {String} progName The software name
 * @param {String} args Args to be handled if any
 */
function software( progName, program, args ) {
    return new Promise( ( resolve, reject ) => {
        if ( program ) {
            if ( program.limpar ) {
                system.limpar().then( runSoftware( progName, program, args ).then( resolve, reject ) );
            } else {
                runSoftware( progName, program, args ).then( resolve, reject );
            }
        } else {
            reject( new CommandNotFoundError( progName ) );
        }
    } );
}

/**
 * Run the specified program
 *
 * @param {String} progName The software name
 * @param {Object} program Command definition from sofwtare.json
 * @param {String} args Args to be handled if any
 */
function runSoftware( progName, program, args ) {
    return new Promise( ( resolve ) => {
        let msg;
        if ( program.message ) {
            msg = { text: program.message, delayed: program.delayed };
        } else {
            msg = window[ progName ]( args ) || "";
            if ( msg.constructor === Object ) {
                if ( !msg.onInput ) {
                    throw new Error( "An onInput callback must be defined!" );
                }
                if ( msg.message ) {
                    output( msg.message );
                }
                readPrompt( msg.prompt || ">" ).then( ( input ) => msg.onInput( input ) )
                    .then( ( finalMsg ) => resolve( finalMsg ) );
                return;
            }
        }
        resolve( msg );
    } );
}

/**
 * Read user input
 *
 * @param {String} promptText The text prefix to display before the <input> prompt
 */
function readPrompt( promptText ) {
    return new Promise( ( resolve ) => {
        const prevPromptText = $( "#input-line .prompt" ).text();
        $( "#input-line .prompt" ).text( promptText );
        term.removeCmdLineListeners();
        cmdLine_.addEventListener( "keydown", promptSubmitted );
        function promptSubmitted( e ) {
            if ( e.keyCode === 13 ) {
                cmdLine_.removeEventListener( "keydown", promptSubmitted );
                term.addCmdLineListeners();
                $( "#input-line .prompt" ).text( prevPromptText );
                resolve( this.value.trim() );
            }
        }
    } );
}

/**
 * List only details about programs the current user has access on the current server.
 */
function allowedSoftwares() {
    const softwares = {};
    for ( const app in softwareInfo ) {
        const program = softwareInfo[ app ];
        if ( program === null ) {
            softwares[ app ] = null;
        } else if (
            ( !program.location || program.location.includes( serverDatabase.serverAddress ) ) &&
            ( !program.protection || program.protection.includes( userDatabase.userId ) )
        ) {
            softwares[ app ] = program;
        }
    }
    return softwares;
}

/*
 * Wrapper to easily define sofwtare programs that act as dweets.
 * Reference code: https://github.com/lionleaf/dwitter/blob/master/dwitter/templates/dweet/dweet.html#L250
 * Notable difference with https://dwitter.net : default canvas dimensions are width=200 & height=200
 * There are usage examples in config/software.js
 */
const FPS = 60;
const epsilon = 1.5;
/* eslint-disable no-unused-vars */
const C = Math.cos;
const S = Math.sin;
const T = Math.tan;

let lastDweetId = 0;
function dweet( u, width, height, delay, style ) {
    width = width || 200;
    height = height || 200;
    delay = delay || 0;
    style = style || "";
    const id = ++lastDweetId;
    let frame = 0;
    let nextFrameMs = 0;
    function loop( frameTime ) {
        frameTime = frameTime || 0;
        const c = document.getElementById( id );
        if ( !c ) {
            console.log( `Stopping dweet rendering: no element with id=${ id } found` );
            return;
        }
        requestAnimationFrame( loop );
        if ( frameTime < nextFrameMs - epsilon ) {
            return; // Skip this cycle as we are animating too quickly.
        }
        nextFrameMs = Math.max( nextFrameMs + 1000 / FPS, frameTime );
        let time = frame / FPS;
        if ( time * FPS | frame - 1 === 0 ) {
            time += 0.000001;
        }
        frame++;
        const x = c.getContext( "2d" );
        x.fillStyle = "white";
        x.strokeStyle = "white";
        x.beginPath();
        x.resetTransform();
        x.clearRect( 0, 0, width, height ); // clear canvas
        u( time, x, c );
    }
    setTimeout( loop, delay + 50 ); // Minimal small delay to let time for the canvas to be inserted
    return `<canvas id="${ id }" width="${ width }" height="${ height }" style="${ style }">`;
}

function R( r, g, b, a ) {
    a = typeof a === "undefined" ? 1 : a;
    return `rgba(${ r | 0 },${ g | 0 },${ b | 0 },${ a })`;
}
