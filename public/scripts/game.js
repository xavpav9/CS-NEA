import Scene from "./ui.js";
import {Model, Card, Player, AnimationState} from "./objects.js";

const canvas = document.querySelector("#c");
const scene = new Scene(canvas);
scene.render();

const model = new Model("card.obj", "", 3);

scene.addModel(model).then(() => {
  // scene.removeModel(model);
});

