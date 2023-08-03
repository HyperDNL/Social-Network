import fs from "fs-extra";
import User from "../models/User.js";
import Post from "../models/Post.js";
import {
  validateStringField,
  validateArrayField,
  validateObjectIdField,
} from "../libs/validators.js";
import { uploadImage, deleteImage } from "../libs/cloudinary.js";
import {
  getExtension,
  isValidImageExtension,
  getFileSizeInMB,
} from "../libs/imagesHandling.js";
import { MAX_IMAGE_SIZE } from "../config/config.js";

export const createPost = async (req, res) => {
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

    const { body, files } = req;

    const { title, content } = body;

    const errors = [];

    if (!title || !content) {
      errors.push({
        error: "Title and Content are required fields",
      });
    }

    if (title && !validateStringField(title)) {
      errors.push({
        error: "Invalid data type in Title. Expected string.",
      });
    }

    if (content && !validateStringField(content)) {
      errors.push({
        error: "Invalid data type in Content. Expected string.",
      });
    }

    const imagesToUpload = [];

    if (files && files.images) {
      const { images } = files;

      if (validateArrayField(images)) {
        images.forEach(({ name, size, tempFilePath }) => {
          const imageExtension = getExtension(name);

          if (!isValidImageExtension(imageExtension)) {
            errors.push({
              error: `Invalid image type (${name}). Only JPG, JPEG, PNG, and WebP images are allowed.`,
            });
          }

          const imageSize = getFileSizeInMB(size);

          if (imageSize > MAX_IMAGE_SIZE) {
            errors.push({
              error: `Image size (${name}) exceeds the maximum allowed (${MAX_IMAGE_SIZE}MB).`,
            });
          }

          imagesToUpload.push({ tempFilePath });
        });
      } else {
        const { name, size, tempFilePath } = images;

        const imageExtension = getExtension(name);

        if (!isValidImageExtension(imageExtension)) {
          errors.push({
            error: `Invalid image type (${name}). Only JPG, JPEG, PNG, and WebP images are allowed.`,
          });
        }

        const imageSize = getFileSizeInMB(size);

        if (imageSize > MAX_IMAGE_SIZE) {
          errors.push({
            error: `Image size (${name}) exceeds the maximum allowed (${MAX_IMAGE_SIZE}MB).`,
          });
        }

        imagesToUpload.push({ tempFilePath });
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    let imageResults;

    if (imagesToUpload.length > 0) {
      try {
        imageResults = await Promise.all(
          imagesToUpload.map(async ({ tempFilePath }) => {
            const imageResult = await uploadImage(tempFilePath);
            await fs.remove(tempFilePath);
            return imageResult;
          })
        );
      } catch (error) {
        const { message } = error;
        return res
          .status(500)
          .json({ message: `Error uploading images: ${message}` });
      }
    }

    const newPost = await Post.create({
      user: _id,
      title,
      content,
      images: imageResults
        ? imageResults.map(({ secure_url, public_id }) => ({
            image: secure_url,
            public_id,
          }))
        : [],
    });

    await currentUser.updateOne({
      $push: { posts: { post: newPost._id } },
    });

    return res.status(201).json(newPost);
  } catch (error) {
    const { message } = error;
    return res
      .status(500)
      .json({ message: `Internal Server Error: ${message}` });
  }
};

export const getPosts = async (req, res) => {
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

    const postIds = currentUser.posts.map(({ post }) => post);
    const posts = await Post.find({
      _id: { $in: postIds },
    });

    return res.status(200).json(posts);
  } catch (error) {
    const { message } = error;
    return res
      .status(500)
      .json({ message: `Internal Server Error: ${message}` });
  }
};

export const getPost = async (req, res) => {
  try {
    const { signedCookies = {}, user, params } = req;
    const { refreshToken } = signedCookies;

    if (!refreshToken || !user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { _id } = user;
    const { id } = params;

    if (!id) {
      return res
        .status(400)
        .json({ message: "The ID parameter of the Post is required" });
    }

    if (!validateObjectIdField(id)) {
      return res
        .status(400)
        .json({ message: "Invalid data type in Post ID. Expected Object ID." });
    }

    const currentUser = await User.findById(_id);

    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const postExists = currentUser.posts.some(({ post }) => post.equals(id));

    if (!postExists) {
      return res.status(404).json({ message: "Post not found" });
    }

    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    return res.status(200).json(post);
  } catch (error) {
    const { message } = error;
    return res
      .status(500)
      .json({ message: `Internal Server Error: ${message}` });
  }
};

export const updatePost = async (req, res) => {
  try {
    const { signedCookies = {}, user, params, body, files } = req;
    const { refreshToken } = signedCookies;

    if (!refreshToken || !user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { _id } = user;
    const { id } = params;

    if (!id) {
      return res
        .status(400)
        .json({ message: "The ID parameter of the Post is required" });
    }

    if (!validateObjectIdField(id)) {
      return res
        .status(400)
        .json({ message: "Invalid data type in Post ID. Expected Object ID." });
    }

    const currentUser = await User.findById(_id);

    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const postIndex = currentUser.posts.findIndex(({ post }) =>
      post.equals(id)
    );

    if (postIndex === -1) {
      return res.status(404).json({ message: "Post not found" });
    }

    const postToUpdate = await Post.findById(id);

    if (!postToUpdate) {
      return res.status(404).json({ message: "Post not found" });
    }

    const { title, content } = body;

    const errors = [];

    if (!title || !content) {
      errors.push({
        error: "Title and Content are required fields",
      });
    }

    if (title && !validateStringField(title)) {
      errors.push({
        error: "Invalid data type in Title. Expected string.",
      });
    }

    if (content && !validateStringField(content)) {
      errors.push({
        error: "Invalid data type in Content. Expected string.",
      });
    }

    const imagesToUpload = [];

    if (files && files.images) {
      const { images } = files;

      if (validateArrayField(images)) {
        images.forEach(({ name, size, tempFilePath }) => {
          const imageExtension = getExtension(name);

          if (!isValidImageExtension(imageExtension)) {
            errors.push({
              error: `Invalid image type (${name}). Only JPG, JPEG, PNG, and WebP images are allowed.`,
            });
          }

          const imageSize = getFileSizeInMB(size);

          if (imageSize > MAX_IMAGE_SIZE) {
            errors.push({
              error: `Image size (${name}) exceeds the maximum allowed (${MAX_IMAGE_SIZE}MB).`,
            });
          }

          imagesToUpload.push({ tempFilePath });
        });
      } else {
        const { name, size, tempFilePath } = images;

        const imageExtension = getExtension(name);

        if (!isValidImageExtension(imageExtension)) {
          errors.push({
            error: `Invalid image type (${name}). Only JPG, JPEG, PNG, and WebP images are allowed.`,
          });
        }

        const imageSize = getFileSizeInMB(size);

        if (imageSize > MAX_IMAGE_SIZE) {
          errors.push({
            error: `Image size (${name}) exceeds the maximum allowed (${MAX_IMAGE_SIZE}MB).`,
          });
        }

        imagesToUpload.push({ tempFilePath });
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const updateValues = {};

    if (title && title !== postToUpdate.title) {
      updateValues.title = title;
    }

    if (content && content !== postToUpdate.content) {
      updateValues.content = content;
    }

    let imageResults;

    if (imagesToUpload.length > 0) {
      try {
        imageResults = await Promise.all(
          imagesToUpload.map(async ({ tempFilePath }) => {
            const imageResult = await uploadImage(tempFilePath);
            await fs.remove(tempFilePath);
            return imageResult;
          })
        );

        updateValues.images = [
          ...postToUpdate.images,
          ...(imageResults
            ? imageResults.map(({ secure_url, public_id }) => ({
                image: secure_url,
                public_id,
              }))
            : []),
        ];
      } catch (error) {
        const { message } = error;
        return res
          .status(500)
          .json({ message: `Error uploading images: ${message}` });
      }
    }

    const updatedPost = await Post.findByIdAndUpdate(
      id,
      { $set: updateValues },
      { new: true }
    );

    return res.json(updatedPost);
  } catch (error) {
    const { message } = error;
    return res
      .status(500)
      .json({ message: `Internal Server Error: ${message}` });
  }
};

export const deleteImageFromPost = async (req, res) => {
  try {
    const { signedCookies = {}, user, params } = req;
    const { refreshToken } = signedCookies;

    if (!refreshToken || !user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { _id } = user;
    const { id, imageId } = params;

    if (!id) {
      return res
        .status(400)
        .json({ message: "The ID parameter of the Post is required" });
    }

    if (!validateObjectIdField(id)) {
      return res
        .status(400)
        .json({ message: "Invalid data type in Post ID. Expected Object ID." });
    }

    if (!imageId) {
      return res
        .status(400)
        .json({ message: "The ID parameter of the Image is required" });
    }

    if (!validateObjectIdField(imageId)) {
      return res.status(400).json({
        message: "Invalid data type in Image ID. Expected Object ID.",
      });
    }

    const currentUser = await User.findById(_id);

    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const userPost = currentUser.posts.find(({ post }) => post.equals(id));

    if (!userPost) {
      return res.status(404).json({ message: "Post not found" });
    }

    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const imageIndex = post.images.findIndex(({ _id }) => _id.equals(imageId));

    if (imageIndex === -1) {
      return res.status(404).json({ message: "Image not found in the Post" });
    }

    try {
      const { public_id } = post.images[imageIndex];

      await deleteImage(public_id);

      post.images.splice(imageIndex, 1);

      await post.save();

      return res.json({ message: "Image deleted successfully" });
    } catch (error) {
      const { message } = error;
      return res
        .status(500)
        .json({ message: `Error deleting image: ${message}` });
    }
  } catch (error) {
    const { message } = error;
    return res
      .status(500)
      .json({ message: `Internal Server Error: ${message}` });
  }
};

export const deletePost = async (req, res) => {
  try {
    const { signedCookies = {}, user, params } = req;
    const { refreshToken } = signedCookies;

    if (!refreshToken || !user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { _id } = user;
    const { id } = params;

    if (!id) {
      return res
        .status(400)
        .json({ message: "The ID parameter of the Post is required" });
    }

    if (!validateObjectIdField(id)) {
      return res
        .status(400)
        .json({ message: "Invalid data type in Post ID. Expected Object ID." });
    }

    const currentUser = await User.findById(_id);

    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const postIndex = currentUser.posts.findIndex(({ post }) =>
      post.equals(id)
    );

    if (postIndex === -1) {
      return res.status(404).json({ message: "Post not found" });
    }

    const postToDelete = await Post.findByIdAndDelete(id);

    if (!postToDelete) {
      return res.status(404).json({ message: "Post not found" });
    }

    await currentUser.updateOne({ $pull: { posts: { post: id } } });

    if (postToDelete.images && postToDelete.images.length > 0) {
      try {
        const imageDeletionPromises = postToDelete.images.map(({ public_id }) =>
          deleteImage(public_id)
        );
        await Promise.all(imageDeletionPromises);
      } catch (error) {
        const { message } = error;
        return res
          .status(500)
          .json({ message: `Error deleting images: ${message}` });
      }
    }

    return res.sendStatus(204);
  } catch (error) {
    const { message } = error;
    return res
      .status(500)
      .json({ message: `Internal Server Error: ${message}` });
  }
};
