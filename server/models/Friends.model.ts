import mongoose, { Document, Schema } from "mongoose";

export enum FriendRequestStatus {
  PENDING = "PENDING",
  ACCEPTED = "ACCEPTED",
  DECLINED = "DECLINED"
}

export interface IFriendRequest extends Document {
  senderId: mongoose.Types.ObjectId;
  receiverId: mongoose.Types.ObjectId;
  status: FriendRequestStatus;
  message: string; 
  createdAt: Date;
  updatedAt: Date;
}

const friendRequestSchema = new Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    status: {
      type: String,
      enum: Object.values(FriendRequestStatus),
      default: FriendRequestStatus.PENDING
    },
    message: {
      type: String,
      default: "Hey there! I'd love to connect with you on MOIR."
    }
  },
  { timestamps: true }
);

export const FriendRequest = mongoose.model<IFriendRequest>(
  "FriendRequest",
  friendRequestSchema
);