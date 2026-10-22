import Scene from "./ui.js";
import {Model, Card, Player, AnimationState} from "./objects.js";

const canvas = document.querySelector("#c");
const scene = new Scene(canvas);
scene.render();

const card = new Card("6d");
card.model.source.translation[2] = -10;

scene.addModel(card.model).then(() => {
  // scene.removeModel(card.model);
});

