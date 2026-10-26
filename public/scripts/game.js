import Scene from "./ui.js";
import {Model, Card, Player, DOC} from "./objects.js";

const canvas = document.querySelector("#c");
const scene = new Scene(canvas);
scene.render();

function makeCards(num, blank=false) {
  const cards = [];
  for (let i=0; i<num; ++i) cards.push(new Card(blank ? "blank" : "6d"));
  return cards;
}

function makeTricks(num) {
  const tricks = [];
  for (let i=0; i<num; ++i) tricks.push(new DOC("trick", makeCards(4)));
  return tricks;
}

const doc = new DOC("pickup", makeCards(80, true));

const player1 = new Player(makeCards(1, true), makeTricks(6), false);
const player2 = new Player(makeCards(13, false), makeTricks(3), true);
const player3 = new Player(makeCards(4, true), [], false);
const player4 = new Player(makeCards(9, true), makeTricks(9), false);
const player5 = new Player(makeCards(2, true), [], false);

scene.addPlayer(player1);
scene.addPlayer(player2);
scene.addPlayer(player3);
scene.addPlayer(player4);
// scene.addPlayer(player5);

// scene.addDoc(doc);


player2.setTurn(true);
scene.setGameState("main");
