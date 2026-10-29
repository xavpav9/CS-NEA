import express from "express";
import { getRoot, postRoot } from "./../controllers/register-controller.js";

const router = express.Router();

router.get("/", getRoot);
router.post("/", postRoot);

export default router;
