import { Schema, model } from "mongoose";

const postSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    images: [
      {
        image: String,
        public_id: String,
      },
    ],
    likes: {
      type: Number,
      default: 0,
    },
    dislikes: {
      type: Number,
      default: 0,
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

postSchema.set("toJSON", {
  transform: (doc, ret, options) => {
    delete ret.user;
    return ret;
  },
});

export default model("Post", postSchema);
