import * as vscode from "vscode";
import { exec } from "child_process";
import { CodeActionRequest } from "./common";

export const findFile = (file: string): Thenable<vscode.Uri> =>
  vscode.workspace.findFiles(file).then((files: vscode.Uri[]) => {
    if (files[0]) {
      return files[0];
    }

    throw "No file found";
  });

export const openFile = (
  file: vscode.Uri,
  viewColumn?: vscode.ViewColumn
): Thenable<vscode.Uri> =>
  vscode.commands
    .executeCommand("vscode.open", vscode.Uri.file(file.path), {
      preserveFocus: true,
      preview: true,
      viewColumn: viewColumn || vscode.ViewColumn.Active
    })
    .then(() => file);

export const lookupCodeActions = (
  request: CodeActionRequest,
  file: vscode.Uri
): Thenable<vscode.CodeAction[]> => {
  const position = new vscode.Position(request.line - 1, request.offset - 1);

  setSelection(position);

  console.log("Doing lookup");
  return new Promise((resolve, reject) => {
    const lookup = () =>
      vscode.commands.executeCommand(
        "vscode.executeCodeActionProvider",
        file,
        new vscode.Range(position, position)
      );

    return loop<vscode.CodeAction[]>(lookup, resolve, 10);
  });
};

const loop = <T>(promise: any, resolve: (result: T) => void, count: number) => {
  console.log("attempt", count);

  if (count === 0) {
    return resolve((<any>[]) as T);
  }

  promise().then((results: T) =>
    (<any>results).length > 0
      ? resolve(<T>results)
      : wait(500).then(() => loop(promise, resolve, count - 1))
  );
};

export const wait = (amount: number) =>
  new Promise((resolve, _) => {
    setTimeout(resolve, amount);
  });

export const setSelection = (position: vscode.Position) => {
  const editor = vscode.window.activeTextEditor;
  if (editor) {
    editor.selection = new vscode.Selection(position, position);
  }
};

export const setCurrentBuffer = (buffer: string) => {
  const activeEditor = vscode.window.activeTextEditor!;

  return activeEditor.edit(editor => {
    const document = activeEditor.document;
    const fullRange = new vscode.Range(
      document.positionAt(0),
      document.positionAt(buffer.length)
    );

    editor.replace(fullRange, buffer);
  });
};

export const switchToWorkspace = (
  path: string,
  inNewWindow: boolean = false
) => {
  const app = "code";
  const command = `${app} ${inNewWindow ? "-n" : "-r"} "${path}"`;

  exec(command, (err, stdout, stderr) => {
    if (err || stderr) {
      vscode.window.showErrorMessage((err || { message: stderr }).message);
    }
  });
};
