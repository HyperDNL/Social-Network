import passport from "passport";

export const verifyUser = (req, res, next) => {
  passport.authenticate("jwt", { session: false }, (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      const { message } = info;
      const errorMessage =
        info && message ? `Unauthorized: ${message}` : "Unauthorized";
      const error = new Error(errorMessage);
      error.statusCode = 401;
      return next(error);
    }
    req.user = user;
    next();
  })(req, res, next);
};
