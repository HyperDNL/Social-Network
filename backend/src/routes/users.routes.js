import { Router } from "express";
import {
  signup,
  signin,
  profile,
  updateProfile,
  followUser,
  changeFollowRequestStatus,
  unfollowUser,
  getFollowing,
  getFollowers,
  getNotifications,
  getUserProfile,
  searchUsers,
  refreshToken,
  logout,
} from "../controllers/users.controllers.js";
import { verifyUser } from "../middlewares/verifyUser.js";

const router = Router();

router.post("/signup", signup);

router.post("/signin", signin);

router.get("/profile", verifyUser, profile);

router.put("/updateProfile", verifyUser, updateProfile);

router.post("/follow/:id", verifyUser, followUser);

router.put("/follow-request/:id", verifyUser, changeFollowRequestStatus);

router.post("/unfollow/:id", verifyUser, unfollowUser);

router.get("/following", verifyUser, getFollowing);

router.get("/followers", verifyUser, getFollowers);

router.get("/notifications", verifyUser, getNotifications);

router.get("/profile/:id", verifyUser, getUserProfile);

router.get("/search", verifyUser, searchUsers);

router.post("/refreshToken", refreshToken);

router.get("/logout", verifyUser, logout);

export default router;
