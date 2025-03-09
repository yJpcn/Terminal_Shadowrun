/* eslint no-unused-vars: 0 */

class FunctionalError extends Error {}

class CommandNotFoundError extends FunctionalError {
    constructor( command ) {
        super();
        this.message = `${ command }: Comando não achado.`;
    }
}

class InvalidCommandParameter extends FunctionalError {
    constructor( command ) {
        super();
        this.message = `Parâmetros inválidos passados para o comando ${ command }`;
    }
}

class AddressNotFoundError extends FunctionalError {
    constructor( address ) {
        super();
        this.message = `Erro : endereço ${ address } não foi encontrado.`;
    }
}

class AddressIsEmptyError extends FunctionalError {
    constructor() {
        super();
        this.message = "Erro: você tem que especificar um endereço!";
    }
}

class UsernameIsEmptyError extends FunctionalError {
    constructor() {
        super();
        this.message = "Erro: Nome de usuário vazio.";
    }
}

class InvalidCredsSyntaxError extends FunctionalError {
    constructor() {
        super();
        this.message = "Erro: sintaxe de credenciais errada: use só um usuário, ou usuário:senha.";
    }
}

class InvalidPasswordError extends FunctionalError {
    constructor( userName ) {
        super();
        this.message = `Senha inválida para o usuário ${ userName }.`;
    }
}

class MailServerIsEmptyError extends FunctionalError {
    constructor() {
        super();
        this.message = "Nenhuma mensagem registrada.";
    }
}

class InvalidMessageKeyError extends FunctionalError {
    constructor() {
        super();
        this.message = "Número de mensagem inválida.";
    }
}

class AlreadyOnServerError extends FunctionalError {
    constructor( serverAddress ) {
        super();
        this.message = `Você já está conectado à ${ serverAddress }`;
    }
}

class UnknownUserError extends FunctionalError {
    constructor( userName ) {
        super();
        this.message = `Usuário ${ userName } desconhecido.`;
    }
}

class ServerRequireUsernameError extends FunctionalError {
    constructor( serverAddress ) {
        super();
        this.message = `Endereço precisa de um usuário para ser acessado; use conectar usuário@${ serverAddress }`;
    }
}

class JsonFetchParseError extends FunctionalError {
    constructor( message ) {
        super();
        this.message = message;
    }
}
