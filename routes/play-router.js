import express from "express";
import {get} from "./../controllers/play-controller.js";

const router = express.Router();

router.get("/:gameId", get);
router.get("/", (req, res) => res.send("Invalid gameId"));

export default router;
