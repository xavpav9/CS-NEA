import path from "node:path";
import express from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";

import indexRouter from "./routes/index.js";

const PORT = /*process.env.PORT || */ 8080;


const app = express();
const server = createServer(app);

app.use(express.static(path.join(import.meta.dirname, "public")));
app.set("views", path.join(import.meta.dirname, "views"));
app.set("view engine", "pug");

app.get("/", indexRouter);



const wss = new WebSocketServer({ server });

wss.on("connection", ws => {
  console.log("New ws client.");

  ws.on("message", data => {
    const message = data.toString();
    console.log("Message from ws client: ", message);
  });

  ws.on("close", () => {
    console.log("Disconnected from a ws client");
  });
});

export default server;
export {PORT};
