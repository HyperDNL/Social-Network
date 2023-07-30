import passport from "passport";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import fs from "fs-extra";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import {
  getToken,
  getRefreshToken,
  COOKIE_OPTIONS,
} from "../helpers/authenticate.js";
import { JWT_SECRET } from "../config/config.js";
import {
  validateStringField,
  validateStringStrictField,
  validateStringStrictFieldWithNumbers,
  validateNumberField,
  validateBoolField,
  validateEmailFormatField,
  validateDateField,
  validateMobileNumberField,
} from "../libs/validators.js";
import { uploadImage, deleteImage } from "../libs/cloudinary.js";

export const signup = async (req, res) => {
  try {
    const { body } = req;

    const { name, last_name, username, email, password } = body;

    const emailUser = await User.findOne({ email });
    const usernameVerify = await User.findOne({ username });

    const errors = [];

    if (!name || !last_name || !username || !email || !password) {
      errors.push({ error: "Required fields are missing or empty" });
    }

    if (emailUser) {
      errors.push({ error: "The E-Mail is already in use" });
    }

    if (usernameVerify) {
      errors.push({ error: "The Username is already in use" });
    }

    if (name && !validateStringStrictField(name)) {
      errors.push({
        error:
          "Invalid data type in Name. Expected string without special characters or numbers.",
      });
    }

    if (last_name && !validateStringStrictField(last_name)) {
      errors.push({
        error:
          "Invalid data type in Last Name. Expected string without special characters or numbers.",
      });
    }

    if (username && !validateStringStrictFieldWithNumbers(username)) {
      errors.push({
        error:
          "Invalid data type in Username. Expected string without special characters.",
      });
    }

    if (email && !validateEmailFormatField(email)) {
      errors.push({
        error:
          "Invalid data type in E-Mail. Expected string with a valid E-Mail format.",
      });
    }

    if (password && !validateStringField(password)) {
      errors.push({
        error: "Invalid data type in Password. Expected string.",
      });
    }

    if (password?.length < 4) {
      errors.push({ error: "Password must be at least 4 characters" });
    }

    if (username?.length < 4) {
      errors.push({ error: "Username must be at least 4 characters" });
    }

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const salt = await bcrypt.genSalt(10);
    const encryptedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      name,
      last_name,
      username,
      email,
      password: encryptedPassword,
    });

    const token = getToken({ _id: newUser._id });
    const refreshToken = getRefreshToken({ _id: newUser._id });

    await newUser.updateOne({
      $push: { refreshToken: { refreshToken } },
    });

    res.cookie("refreshToken", refreshToken, COOKIE_OPTIONS);

    return res.json({ success: true, token });
  } catch (error) {
    const { message } = error;
    return res
      .status(500)
      .json({ message: `Internal Server Error: ${message}` });
  }
};

export const signin = async (req, res) => {
  try {
    const { body } = req;

    const { email, password } = body;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const errors = [];

    if (!email || !password) {
      errors.push({ error: "Required fields are missing or empty" });
    }

    if (email && !validateStringField(email)) {
      errors.push({
        error: "Invalid data type in E-Mail. Expected string.",
      });
    }

    if (password && !validateStringField(password)) {
      errors.push({
        error: "Invalid data type in Password. Expected string.",
      });
    }

    if (email && !emailRegex.test(email)) {
      errors.push({ error: "E-Mail is not valid" });
    }

    if (password?.length < 4) {
      errors.push({ error: "Password must be at least 4 characters" });
    }

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    passport.authenticate(
      "login",
      { session: false },
      async (error, user, info) => {
        if (error) {
          const { message } = error;
          return res
            .status(500)
            .json({ message: `Internal Server Error: ${message}` });
        }

        if (!user) {
          const { message } = info;
          return res.status(401).json({ message: `Unauthorized: ${message}` });
        }

        const { _id } = user;

        const token = getToken({ _id });
        const refreshToken = getRefreshToken({ _id });

        const currentUser = await User.findById(_id);
        await currentUser.updateOne({
          $push: { refreshToken: { refreshToken } },
        });

        res.cookie("refreshToken", refreshToken, COOKIE_OPTIONS);

        return res.json({ success: true, token });
      }
    )(req, res);
  } catch (error) {
    const { message } = error;
    return res
      .status(500)
      .json({ message: `Internal Server Error: ${message}` });
  }
};

export const profile = async (req, res) => {
  try {
    const { signedCookies = {}, user } = req;
    const { refreshToken } = signedCookies;

    if (!refreshToken || !user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    return res.json(user);
  } catch (error) {
    const { message } = error;
    return res
      .status(500)
      .json({ message: `Internal Server Error: ${message}` });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { signedCookies = {}, user } = req;
    const { refreshToken } = signedCookies;

    if (!refreshToken || !user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { files, body } = req;
    const {
      name,
      last_name,
      description,
      date_birth,
      phone_number,
      genre,
      private_profile,
    } = body;
    const { _id } = user;

    const userProfile = await User.findById(_id);

    if (!userProfile) {
      return res.status(404).json({ message: "User not found" });
    }

    const errors = [];

    if (!name || !last_name) {
      errors.push({
        error: "Name and last name are required fields",
      });
    }

    if (name && !validateStringStrictField(name)) {
      errors.push({
        error:
          "Invalid data type in Name. Expected string without special characters or numbers.",
      });
    }

    if (last_name && !validateStringStrictField(last_name)) {
      errors.push({
        error:
          "Invalid data type in Last Name. Expected string without special characters or numbers.",
      });
    }

    if (description && !validateStringField(description)) {
      errors.push({
        error: "Invalid data type in Description. Expected string.",
      });
    }

    if (date_birth && !validateDateField(date_birth)) {
      errors.push({
        error:
          "Invalid data type in Date of Birth. Expected valid Date format.",
      });
    }

    if (phone_number && !validateNumberField(phone_number)) {
      errors.push({
        error: "Invalid data type in Phone Number. Expected number.",
      });
    }

    if (genre && !validateStringStrictField(genre)) {
      errors.push({
        error:
          "Invalid data type in Genre. Expected string without special characters or numbers.",
      });
    }

    if (private_profile !== undefined && !validateBoolField(private_profile)) {
      errors.push({
        error: "Invalid data type in Private Profile. Expected boolean.",
      });
    }

    if (phone_number && !validateMobileNumberField(phone_number)) {
      errors.push({
        error: "Invalid phone number format. Expected a 10-digit number.",
      });
    }

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const updateValues = {};

    if (name && name !== userProfile.name) {
      updateValues.name = name;
    }

    if (last_name && last_name !== userProfile.last_name) {
      updateValues.last_name = last_name;
    }

    if (description && description !== userProfile.description) {
      updateValues.description = description;
    }

    if (date_birth && date_birth !== userProfile.date_birth) {
      updateValues.date_birth = date_birth;
    }

    if (phone_number && phone_number !== userProfile.phone_number) {
      updateValues.phone_number = phone_number;
    }

    if (genre && genre !== userProfile.genre) {
      updateValues.genre = genre;
    }

    if (
      private_profile !== undefined &&
      private_profile !== userProfile.private_profile
    ) {
      updateValues.private_profile = private_profile;
    }

    if (files && files.profile_picture) {
      try {
        const { profile_picture } = files;

        if (
          userProfile.profile_picture &&
          userProfile.profile_picture.public_id
        ) {
          await deleteImage(userProfile.profile_picture.public_id);
        }

        const uploadedImage = await uploadImage(profile_picture.tempFilePath);

        await fs.remove(profile_picture.tempFilePath);

        updateValues.profile_picture = {
          url: uploadedImage.secure_url,
          public_id: uploadedImage.public_id,
        };
      } catch (error) {
        const { message } = error;
        return res
          .status(500)
          .json({ message: `Error uploading profile picture: ${message}` });
      }
    }

    await User.findByIdAndUpdate(_id, { $set: updateValues }, { new: true });

    return res.json({ success: true });
  } catch (error) {
    const { message } = error;
    return res
      .status(500)
      .json({ message: `Internal Server Error: ${message}` });
  }
};

export const followUser = async (req, res) => {
  try {
    const { signedCookies = {}, user, params } = req;
    const { refreshToken } = signedCookies;

    if (!refreshToken || !user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { _id } = user;
    const { id } = params;

    const currentUser = await User.findById(_id);

    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const userToFollow = await User.findById(id);

    if (!userToFollow) {
      return res.status(404).json({ message: "User to follow not found" });
    }

    if (_id.toString() === id) {
      return res.status(400).json({ message: "You cannot follow yourself" });
    }

    if (currentUser.following.some(({ user }) => user.equals(id))) {
      return res
        .status(400)
        .json({ message: "You are already following this user" });
    }

    const notification = await Notification.create({
      sender: _id,
      receiver: id,
      type: "follow_request",
      status: "pending",
    });

    await userToFollow.updateOne({
      $push: { notifications: { notification: notification._id } },
    });

    res.json({ message: "Follow request sent" });
  } catch (error) {
    const { message } = error;
    return res
      .status(500)
      .json({ message: `Internal Server Error: ${message}` });
  }
};

export const changeFollowRequestStatus = async (req, res) => {
  try {
    const { signedCookies = {}, user, params, body } = req;
    const { refreshToken } = signedCookies;

    if (!refreshToken || !user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { _id } = user;
    const { id } = params;

    const { status } = body;

    const statusValues = ["pending", "accepted", "rejected"];

    if (!statusValues.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const currentUser = await User.findById(_id);

    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const followRequest = await Notification.findOne({
      _id: id,
      receiver: _id,
      type: "follow_request",
      status: "pending",
    });

    if (!followRequest) {
      return res.status(404).json({ message: "Follow request not found" });
    }

    followRequest.status = status;
    await followRequest.save();

    if (status === "accepted") {
      const acceptedNotification = await Notification.create({
        sender: _id,
        receiver: followRequest.sender,
        type: "accepted_request",
      });

      await User.findByIdAndUpdate(followRequest.sender, {
        $push: { notifications: { notification: acceptedNotification._id } },
      });

      await currentUser.updateOne({
        $push: { followers: { user: followRequest.sender } },
      });

      await User.findByIdAndUpdate(followRequest.sender, {
        $push: { following: { user: _id } },
      });
    }

    res.json({ message: `Follow request ${status}` });
  } catch (error) {
    const { message } = error;
    return res
      .status(500)
      .json({ message: `Internal Server Error: ${message}` });
  }
};

export const unfollowUser = async (req, res) => {
  try {
    const { signedCookies = {}, user, params } = req;
    const { refreshToken } = signedCookies;

    if (!refreshToken || !user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { _id } = user;
    const { id } = params;

    const currentUser = await User.findById(_id);

    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const userToUnfollow = await User.findById(id);

    if (!userToUnfollow) {
      return res.status(404).json({ message: "User to unfollow not found" });
    }

    if (!currentUser.following.some(({ user }) => user.equals(id))) {
      return res
        .status(400)
        .json({ message: "You are not following this user" });
    }

    await currentUser.updateOne({ $pull: { following: { user: id } } });

    await userToUnfollow.updateOne({ $pull: { followers: { user: _id } } });

    res.json({ message: "You unfollowed this user" });
  } catch (error) {
    const { message } = error;
    return res
      .status(500)
      .json({ message: `Internal Server Error: ${message}` });
  }
};

export const getFollowing = async (req, res) => {
  try {
    const { signedCookies = {}, user } = req;
    const { refreshToken } = signedCookies;

    if (!refreshToken || !user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { _id } = user;

    const currentUser = await User.findById(_id);

    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const followingIds = currentUser.following.map(({ user }) => user);
    const followingUsers = await User.find({ _id: { $in: followingIds } });

    const followingCount = followingUsers.length;

    res.json({ followingCount, followingUsers });
  } catch (error) {
    const { message } = error;
    return res
      .status(500)
      .json({ message: `Internal Server Error: ${message}` });
  }
};

export const getFollowers = async (req, res) => {
  try {
    const { signedCookies = {}, user } = req;
    const { refreshToken } = signedCookies;

    if (!refreshToken || !user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { _id } = user;

    const currentUser = await User.findById(_id);

    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const followersIds = currentUser.followers.map(({ user }) => user);
    const followerUsers = await User.find({ _id: { $in: followersIds } });

    const followersCount = followerUsers.length;

    res.json({ followersCount, followerUsers });
  } catch (error) {
    const { message } = error;
    return res
      .status(500)
      .json({ message: `Internal Server Error: ${message}` });
  }
};

export const getNotifications = async (req, res) => {
  try {
    const { signedCookies = {}, user } = req;
    const { refreshToken } = signedCookies;

    if (!refreshToken || !user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { _id } = user;

    const currentUser = await User.findById(_id);

    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const notificationIds = currentUser.notifications.map(
      ({ notification }) => notification
    );
    const notifications = await Notification.find({
      _id: { $in: notificationIds },
    });

    res.json(notifications);
  } catch (error) {
    const { message } = error;
    return res
      .status(500)
      .json({ message: `Internal Server Error: ${message}` });
  }
};

export const getUserProfile = async (req, res) => {
  try {
    const { signedCookies = {}, user, params } = req;
    const { refreshToken } = signedCookies;

    if (!refreshToken || !user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { _id } = user;
    const { id } = params;

    const currentUser = await User.findById(_id);

    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const userToView = await User.findById(id);

    if (!userToView) {
      return res.status(404).json({ message: "User to view not found" });
    }

    if (
      userToView.private_profile &&
      !currentUser.following.some(({ user }) => user.equals(id))
    ) {
      const reducedProfile = {
        name: userToView.name,
        last_name: userToView.last_name,
        username: userToView.username,
        description: userToView.description,
        profile_picture: userToView.profile_picture,
        private_profile: userToView.private_profile,
      };

      return res.json(reducedProfile);
    }

    const fullProfile = {
      name: userToView.name,
      last_name: userToView.last_name,
      username: userToView.username,
      description: userToView.description,
      profile_picture: userToView.profile_picture,
      date_birth: userToView.date_birth,
      phone_number: userToView.phone_number,
      genre: userToView.genre,
      private_profile: userToView.private_profile,
      followers: userToView.followers,
      following: userToView.following,
      posts: userToView.posts,
    };

    return res.json(fullProfile);
  } catch (error) {
    const { message } = error;
    return res
      .status(500)
      .json({ message: `Internal Server Error: ${message}` });
  }
};

export const searchUsers = async (req, res) => {
  try {
    const { signedCookies = {}, user, query } = req;
    const { refreshToken } = signedCookies;

    if (!refreshToken || !user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { _id } = user;

    const currentUser = await User.findById(_id);

    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const { q } = query;

    if (!q) {
      return res.status(400).json({ message: "Query parameter is required" });
    }

    const regexQuery = q.replace(/ñ/gi, "[ñnÑN]");

    const regexOptions = "i";

    const users = await User.aggregate([
      {
        $match: {
          $text: { $search: q, $diacriticSensitive: false },
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          last_name: 1,
          username: 1,
          profile_picture: 1,
          score: { $meta: "textScore" },
        },
      },
      { $sort: { score: { $meta: "textScore" } } },
    ]).exec();

    if (users.length === 0) {
      const suggestedUsers = await User.aggregate([
        {
          $match: {
            $or: [
              { name: { $regex: regexQuery, $options: regexOptions } },
              { last_name: { $regex: regexQuery, $options: regexOptions } },
              { username: { $regex: regexQuery, $options: regexOptions } },
            ],
          },
        },
        { $limit: 8 },
        {
          $project: {
            _id: 1,
            name: 1,
            last_name: 1,
            username: 1,
            profile_picture: 1,
          },
        },
      ]).exec();

      return res.json(suggestedUsers);
    }

    res.json(users);
  } catch (error) {
    const { message } = error;
    return res
      .status(500)
      .json({ message: `Internal Server Error: ${message}` });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const { signedCookies = {} } = req;
    const { refreshToken } = signedCookies;

    if (!refreshToken) {
      return res.status(401).json({
        message: "Unauthorized: Refresh token does not exist or is invalid",
      });
    }

    let decodedToken;

    try {
      decodedToken = jwt.verify(refreshToken, JWT_SECRET);
    } catch (error) {
      return res
        .status(401)
        .json({ message: "Unauthorized: Refresh token expired" });
    }

    const { _id } = decodedToken;

    const currentUser = await User.findById(_id);

    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const matchingRefreshToken = currentUser.refreshToken.find(
      (token) => token.refreshToken === refreshToken
    );

    if (!matchingRefreshToken) {
      return res
        .status(401)
        .json({ message: "Unauthorized: Refresh token mismatch" });
    }

    await currentUser.updateOne({ $pull: { refreshToken: { refreshToken } } });

    const token = getToken({ _id });
    const newRefreshToken = getRefreshToken({ _id });

    await currentUser.updateOne({
      $push: { refreshToken: { refreshToken: newRefreshToken } },
    });

    res.cookie("refreshToken", newRefreshToken, COOKIE_OPTIONS);

    return res.json({ success: true, token });
  } catch (error) {
    const { message } = error;
    return res
      .status(500)
      .json({ message: `Internal Server Error: ${message}` });
  }
};

export const logout = async (req, res) => {
  try {
    const { signedCookies = {}, user } = req;
    const { refreshToken } = signedCookies;

    if (!refreshToken || !user) {
      return res.status(400).json({ message: "Invalid request" });
    }

    const { _id } = user;

    const currentUser = await User.findByIdAndUpdate(
      _id,
      { $pull: { refreshToken: { refreshToken } } },
      { new: true }
    );

    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.clearCookie("refreshToken");
    return res.json({ success: true });
  } catch (error) {
    const { message } = error;
    return res
      .status(500)
      .json({ message: `Internal Server Error: ${message}` });
  }
};
