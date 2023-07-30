import jwt from "jsonwebtoken";
import {
  JWT_SECRET,
  SESSION_EXPIRY,
  REFRESH_TOKEN_EXPIRY,
} from "../config/config.js";

const dev = process.env.NODE_ENV !== "production";

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: !dev,
  signed: true,
  maxAge: eval(REFRESH_TOKEN_EXPIRY) * 1000,
  sameSite: "none",
};

export const generateToken = (user, expiresIn) => {
  return jwt.sign(user, JWT_SECRET, {
    expiresIn,
  });
};

export const getToken = (user) => {
  const expiresIn = eval(SESSION_EXPIRY);
  return generateToken(user, expiresIn);
};

export const getRefreshToken = (user) => {
  const expiresIn = eval(REFRESH_TOKEN_EXPIRY);
  return generateToken(user, expiresIn);
};
