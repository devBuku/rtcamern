import mongoose from "mongoose";

export interface UserDocument extends mongoose.Document {
  clerkId: string;
  email: string;
  fullName: string;
  profilePic: string;
}

const userSchema = new mongoose.Schema<UserDocument>(
  {
    clerkId: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    profilePic: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

const User = mongoose.model("User", userSchema);
export default User;
