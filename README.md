# Overview

This extensions runs a simple server within Visual Studio Code which allows external programs to talk to it.

Specifically this extension is intended to allow vim to request code actions (eg. "lightbulb" actions) for any provided file.  See the vim plugin [vim-ask-vscode](https://github.com/kizza/vim-ask-vscode) for usage.

# How it works

This extension will load the mini server at launch time and put a little "Ask vscode running" message in the status bar.  It will then listen to requests from clients.

These requests include a `rootPath`, `filePath`, `line` and `offset`.  It will then execute the `code action provider` (used for the "lightbulb" menu) and return the results (including `textChanges` array) to the client as `json`.

### Commands

Two commands are added via this extension.

- Start 'Ask vscode' Server
- Stop 'Ask vscode' Server



