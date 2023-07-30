import { Schema, model } from "mongoose";

const notificationSchema = new Schema(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    post: {
      type: Schema.Types.ObjectId,
      ref: "Post",
    },
    type: {
      type: String,
      enum: ["follow_request", "accepted_request", "like"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
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

export default model("Notification", notificationSchema);
