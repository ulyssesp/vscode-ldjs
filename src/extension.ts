'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as ldjs from 'lambdadesignerjs';
import * as net from 'net';
import { Either, tryCatch, isLeft } from 'fp-ts/lib/Either';
import { StrMap } from 'fp-ts/lib/StrMap';
import { networkInterfaces } from 'os';
import { option } from 'fp-ts/lib/Option';
import { fstat } from 'fs';

let config = vscode.workspace.getConfiguration('ldjs')

let replcache = []

function debounce(func, wait, immediate) {
	var timeout;
	return function() {
		var context = this, args = arguments;
		var later = function() {
			timeout = null;
			if (!immediate) func.apply(context, args);
		};
		var callNow = immediate && !timeout;
		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
		if (callNow) func.apply(context, args);
	};
};


class Socket {
	readonly SERVER_URL = config.get<string>('server_url');
	readonly SERVER_PORT = config.get<number>('server_port');
	timeout: number = 1000;
	socket: net.Socket;
	connected: boolean = false;

	constructor() {
		this.socket = new net.Socket();
		this.socket.on('connect', this.connectHandler.bind(this));
		this.socket.on('timeout', this.timeoutHandler.bind(this));
		this.socket.on('close', this.closeHandler.bind(this));
		this.socket.on('error', () => {});
	}

	connectHandler() {
		this.connected = true;
	}

	closeHandler() {
		this.connected = false;
		setTimeout(this.makeConnection.bind(this), this.timeout);
	}

	timeoutHandler() {
		setTimeout(this.makeConnection.bind(this), this.timeout);
	}

	makeConnection() {
		this.socket.connect(config.get<number>('server_port'), config.get<string>('server_url'));
	}

	send(message: string) {
		if(this.connected) {
			this.socket.write(message + "\n");
		}
    }
    
    dispose() {
        this.socket.destroy()
    }
}

class LDJSBridge {
    private _outputChannel: vscode.OutputChannel = vscode.window.createOutputChannel("ldjs")
    private socket = new Socket();
    private lastText;
    private fileUri;

    public constructor(fileUri){
        this.socket.makeConnection();
        this.fileUri = fileUri
        this._outputChannel.show();
    }

    public update(){
        if(vscode.window.activeTextEditor.document.uri.fsPath !== this.fileUri.fsPath) { return; }
        let text = vscode.window.activeTextEditor.document.getText();
        if(text != this.lastText) {
            this.lastText = text;
            this._outputChannel.clear()
            this.runForStatus(text).slice(0, 8).map(l => this._outputChannel.appendLine(l))
        }
    }

    run(obj: string) {
        let replaced = obj.replace(/\n/g, "\\n").replace(/"/g, "\\\'");
        obj = obj.replace("{CommandCode}", '`""' + replaced + '""`')
        return Function("return (function(c, v, require) { return v((function() { " + obj + " })())})")()(ldjs, (ns) => ldjs.validateNodes(ns).map(n => ldjs.nodesToJSON(ns)), (v) => {
            let docuri = vscode.window.activeTextEditor.document.uri.path
            let path = docuri.substr(0, docuri.lastIndexOf('/') + 1) + v
            if(replcache.indexOf(path) == -1) {
                replcache.push(path);
            }
            return require(path);
        })
    }

    runForStatus(text) {
        let result: Either<string[], string> = tryCatch<Either<string[], string>>(() => {
            return this.run(text) as Either<string[], string>
        }).mapLeft(e => {
            return [e.message].concat(e.stack.split('\n'))
        }).chain(r => r)
        if(result.isRight()) {
            this.socket.send(result.value);
            return ["Correct"];
        } else {
            return result.value;
        }
    }

    dispose() {
        this.socket.dispose();
        this._outputChannel.dispose();
    }
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "vscode-ldjs" is now active!');
    var bridge = undefined;

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    let bridgeupdate;
    let startcmd;
    let start = vscode.commands.registerCommand('extension.ldjsstart', () => {
        bridge = new LDJSBridge(vscode.window.activeTextEditor.document.uri)
        bridgeupdate = debounce(bridge.update.bind(bridge), 200, false)
        startcmd = vscode.window.onDidChangeTextEditorSelection((e) => {
            if (bridgeupdate != undefined) {
                bridgeupdate();
            }
        })
        context.subscriptions.push(startcmd);
    });

    let run = vscode.commands.registerCommand('extension.ldjsrun', () => {
        bridgeupdate = undefined
        if(startcmd != undefined) {
            startcmd.dispose();
            startcmd = undefined;
        }
        bridge = bridge !== undefined ? bridge : new LDJSBridge(vscode.window.activeTextEditor.document.uri)
        bridge.update()
    });


    let end = vscode.commands.registerCommand('extension.ldjsend', () => {
        if(bridge != undefined) {
            bridge.dispose();
            bridge = undefined;
        }
        if(startcmd != undefined) {
            startcmd.dispose();
            startcmd = undefined
        }
        bridgeupdate = undefined;
    });

    let clearRequire = vscode.commands.registerCommand('extension.ldjsclearrequire', () => {
        for(let path of replcache) {
            delete require.cache[path]
        }
        replcache = []
    });

    
    context.subscriptions.push(start);
    context.subscriptions.push(run);
    context.subscriptions.push(end);
    context.subscriptions.push(clearRequire);
}

// this method is called when your extension is deactivated
export function deactivate() {
}