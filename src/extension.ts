import * as vscode from "vscode";
import { server } from "./server";
import {
  lookupCodeActions,
  openFile,
  setCurrentBuffer,
  switchToWorkspace,
  wait,
  findFile,
  getAllText
} from "./util";
import {
  ChangeWorkspaceRequest,
  CodeActionRequest,
  Request,
  RequestType,
  Response,
  ResponseType,
  CodeActionResponse,
  CodeAction
} from "./common";

const { assign } = Object;

const startServer = (notify: boolean = true) => {
  if (server.isRunning()) {
    return vscode.window.showInformationMessage(
      "Vim completion server is already running"
    );
  }

  server.listen(5004, "127.0.0.1");
  notify &&
    vscode.window.showInformationMessage("Started vim completion server");
};

const stopServer = () => {
  server.close();
  vscode.window.showInformationMessage("Stopped server");
};

export function activate(context: vscode.ExtensionContext) {
  const disposable = [];

  disposable.push(
    vscode.commands.registerCommand("extension.startServer", () => {
      startServer();
    })
  );

  disposable.push(
    vscode.commands.registerCommand("extension.stopServer", () => {
      stopServer();
    })
  );

  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  disposable.push(statusBarItem);

  const updateStatusBarItem = () => {
    statusBarItem.color = "#3399cc";
    statusBarItem.text = server.isRunning()
      ? `$(broadcast) Ask vscode running`
      : `$(circle-slash) Ask vscode not running`;
    statusBarItem.show();
  };

  server.recieve = (data: Request): Promise<Response> => {
    if (data === undefined) {
      return Promise.resolve({ status: "No data?" });
    }

    switch (data.type) {
      case RequestType.ChangeWorkspace:
        return changeWorkspace(data as ChangeWorkspaceRequest);
      case RequestType.CodeAction:
        return codeActionRequestHandler(data as CodeActionRequest)
          .catch(e => {
            console.error("Error requesting code action", e);
            return { status: "Error looking up code action" };
          })
          .then((response: Response) => response);
      case RequestType.Ping:
        return Promise.resolve({ type: ResponseType.Pong, status: "Pong" });
      default:
        return Promise.resolve({ status: "Pong" });
    }
  };

  server.on("listening", () => {
    console.log("TCP server socket is listening.");
    updateStatusBarItem();
  });

  server.on("close", () => {
    console.log("TCP server socket is closed.");
    updateStatusBarItem();
  });

  server.on("error", (error: Error) => {
    console.error(JSON.stringify(error));
    updateStatusBarItem();
  });

  updateStatusBarItem();

  startServer(false);

  context.subscriptions.push(...disposable);
}

const changeWorkspace = (
  request: ChangeWorkspaceRequest
): Promise<Response> => {
  switchToWorkspace(request.rootPath);
  return Promise.resolve({ status: "Changing workspace..." });
};

const codeActionRequestHandler = (
  request: CodeActionRequest
): Promise<Response> => {
  if (vscode.workspace.rootPath !== request.rootPath) {
    const label = "Switch workspace";
    vscode.window
      .showWarningMessage("Please change to correct workspace", ...[label])
      .then(selection => {
        if (selection === label) {
          switchToWorkspace(request.rootPath);
        }
      });

    return Promise.resolve({
      status: "Please change to correct workspace",
      type: ResponseType.WrongWorkspace
    });
  }

  return Promise.resolve(request.filePath)
    .then(findFile)
    .then(openFile)
    .then((file: vscode.Uri) =>
      setCurrentBuffer(request.buffer)
        .then(() => wait(400))
        .then(() => lookupCodeActions(request, file))
        .then((actions: vscode.CodeAction[]) => {
          console.log("Intellisense results", actions);

          if (actions.length === 0) {
            return { status: "No actions returned" };
          } else {
            return {
              status: `${actions.length} actions returned`,
              type: ResponseType.CodeAction,
              actions: actions.map(action => makeCodeAction(action))
            };
          }
        })
    );
};

const makeCodeAction = (codeAction: vscode.CodeAction): CodeAction => {
  try {
    switch (codeAction!.command!.command) {
      case "_typescript.applyFixAllCodeAction":
        return {
          title: `${codeAction.title}`,
          buffer: getAllText(),
          textChanges: []
        };
      default:
        return {
          title: `${codeAction.title}`,
          textChanges: codeAction!.command!.arguments![0].changes[0].textChanges
        };
    }
  } catch (e) {
    return {
      title: `${codeAction.title} (Can't yet ${codeAction.command!.command})`,
      textChanges: []
    };
  }
};

export function deactivate() {
  stopServer();
}
