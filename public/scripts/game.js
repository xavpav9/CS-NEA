import Scene from "./ui.js";
import {Model, Card, Player, AnimationState} from "./objects.js";

const canvas = document.querySelector("#c");
const scene = new Scene(canvas);
scene.render();

const cards = [];
for (let i=0; i<1; ++i) cards.push(new Card("6d"));

const player = new Player(cards, true);

scene.addPlayer(player);
