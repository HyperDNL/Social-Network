import { Schema, model } from "mongoose";

const Session = new Schema({
  refreshToken: {
    type: String,
    default: "",
  },
});

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    last_name: {
      type: String,
      required: true,
      trim: true,
    },
    username: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    profile_picture: {
      url: {
        type: String,
        default: "",
      },
      public_id: {
        type: String,
        default: "",
      },
    },
    date_birth: {
      type: Date,
      default: Date.now,
    },
    phone_number: {
      type: Number,
      default: null,
    },
    genre: {
      type: String,
      trim: true,
      default: "",
    },
    private_profile: {
      type: Boolean,
      default: false,
    },
    followers: [
      {
        user: {
          type: Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],
    following: [
      {
        user: {
          type: Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],
    posts: [
      {
        post: {
          type: Schema.Types.ObjectId,
          ref: "Post",
        },
      },
    ],
    notifications: [
      {
        notification: {
          type: Schema.Types.ObjectId,
          ref: "Notification",
        },
      },
    ],
    authStrategy: {
      type: String,
      default: "local",
    },
    refreshToken: {
      type: [Session],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

userSchema.index({ name: "text", last_name: "text", username: "text" });

userSchema.set("toJSON", {
  transform: (doc, ret, options) => {
    delete ret.password;
    delete ret.refreshToken;
    delete ret.authStrategy;
    return ret;
  },
});

export default model("User", userSchema);
