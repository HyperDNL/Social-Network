import { ALLOWED_IMAGE_EXTENSIONS } from "../config/config.js";

export const getExtension = (filename) => {
  const dotIndex = filename.lastIndexOf(".");
  if (dotIndex !== -1) {
    return filename.substr(dotIndex).toLowerCase();
  }
  return "";
};

export const isValidImageExtension = (extension) => {
  return ALLOWED_IMAGE_EXTENSIONS.includes(extension);
};

export const getFileSizeInMB = (bytes) => {
  return bytes / (1024 * 1024);
};
