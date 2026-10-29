import express from "express";
import { getRoot } from "./../controllers/login-controller.js";

const router = express.Router();

router.get("/", getRoot);

export default router;
