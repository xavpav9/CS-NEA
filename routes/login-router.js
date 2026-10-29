import express from "express";
import { getRoot, postRoot } from "./../controllers/login-controller.js";

const router = express.Router();

router.get("/", getRoot);
router.post("/", postRoot);

export default router;
