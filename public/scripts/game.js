import Scene from "./ui.js";
import {Model, Card, Player, AnimationState} from "./objects.js";

const canvas = document.querySelector("#c");
const scene = new Scene(canvas);
scene.render();

function makeCards(num, blank=false) {
  const cards = [];
  for (let i=0; i<num; ++i) cards.push(new Card(blank ? "blank" : "6d"));
  return cards;
}

const player1 = new Player(makeCards(1, true), false);
const player2 = new Player(makeCards(8, false), true);
const player3 = new Player(makeCards(4, true), false);
const player4 = new Player(makeCards(13, true), false);

scene.addPlayer(player1);
scene.addPlayer(player2);
scene.addPlayer(player3);
scene.addPlayer(player4);
// scene.addPlayer(player5);
