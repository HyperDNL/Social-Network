import { Router } from "express";
import {
  createPost,
  getPosts,
  getPost,
  updatePost,
  deleteImageFromPost,
  deletePost,
} from "../controllers/posts.controllers.js";
import { verifyUser } from "../middlewares/verifyUser.js";

const router = Router();

router.post("/", verifyUser, createPost);

router.get("/", verifyUser, getPosts);

router.get("/:id", verifyUser, getPost);

router.put("/:id", verifyUser, updatePost);

router.delete("/:id/images/:imageId", verifyUser, deleteImageFromPost);

router.delete("/:id", verifyUser, deletePost);

export default router;
