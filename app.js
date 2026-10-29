import path from "node:path";
import express from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";

import session from "express-session";
import cookieParser from "cookie-parser";

import indexRouter from "./routes/index-router.js";
import playRouter from "./routes/play-router.js";
import loginRouter from "./routes/login-router.js";
import logoutRouter from "./routes/logout-router.js";

import { handleGame } from "./controllers/play-controller.js";
import { seedDatabase } from "./models/database.js";

const PORT = /*process.env.PORT || */ 8080;

// Initialise Express, Server and Database 
const app = express();
const server = createServer(app);
seedDatabase();

// Settings
app.use(express.static(path.join(import.meta.dirname, "public")));
app.set("views", path.join(import.meta.dirname, "views"));
app.set("view engine", "pug");

// Middleware
app.use(express.urlencoded({extended: true})); // For POST req.body
app.use(session({
  secret: crypto.randomUUID(),
  resave: false,
  saveUninitialized: false,
}));
app.use(cookieParser());

// Routers
app.use("/", indexRouter);
app.use("/login", loginRouter);
app.use("/logout", logoutRouter);
app.use("/play", (req, res, next) => {
  if (req.session.user) next();
  else res.redirect("/login");
}, playRouter);


// Websockets
const wss = new WebSocketServer({ server });

wss.on("connection", ws => {
  console.log("New ws client.");

  ws.on("message", data => {
    const message = data.toString();

    if (message === "play") {
      handleGame(ws);
    } else {
      console.log("Message from ws client: ", message);
    }
  });

  ws.on("close", () => {
    console.log("Disconnected from a ws client");
  });
});

export default server;
export {PORT};
