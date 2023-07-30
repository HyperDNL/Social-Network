import passport from "passport";
import { Strategy, ExtractJwt } from "passport-jwt";
import User from "../models/User.js";
import { JWT_SECRET } from "../config/config.js";

const options = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: JWT_SECRET,
};

passport.use(
  new Strategy(options, async (jwt_payload, done) => {
    try {
      const { _id } = jwt_payload;
      const user = await User.findById({ _id });

      if (user) {
        return done(null, user);
      } else {
        return done(null, false, { message: "User not found" });
      }
    } catch (err) {
      return done(err, false, { message: "Database error" });
    }
  })
);
