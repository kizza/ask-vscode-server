import { Socket } from "net";
import { Request, Response } from "./common";
const { assign } = Object;

const server = require("net").createServer((socket: Socket) => {
  socket.on("data", (buffer: Buffer) => {
    const data = JSON.parse(buffer.toString());
    const request = assign({}, data, {
      line: parseInt(data.line),
      column: parseInt(data.column)
    }) as Request;

    console.log("Got data\r\n", data);

    server.recieve(request).then((response: Response) => {
      console.log("got response to send", response);

      socket.write(JSON.stringify(response));
      socket.pipe(socket);
      socket.end();
    });
  });

  socket.on("end", () => {
    console.log("Socked ended");
  });
});

server.isRunning = () => !!server._handle;

export { server };
