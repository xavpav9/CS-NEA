import express from "express";
import {get} from "./../controllers/play-controller.js";

const router = express.Router();

router.get("/:gameID", get);
router.get("/", (req, res) => res.send("Please provide a gameID."));

export default router;
