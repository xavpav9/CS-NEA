import express from "express";
import { getRoot } from "./../controllers/logout-controller.js";

const router = express.Router();

router.get("/", getRoot);

export default router;
