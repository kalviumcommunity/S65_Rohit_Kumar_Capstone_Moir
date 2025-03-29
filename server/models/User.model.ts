import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions, Secret } from 'jsonwebtoken';

// Define UserStatus enum
export enum UserStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  AWAY = 'away',
  BUSY = 'busy'
}

// Define Session interface
export interface ISession extends Document {
  userId: mongoose.Types.ObjectId;
  sessionToken: string;
  expires: Date;
  ipAddress?: string;
  deviceInfo?: string;
}

// Define Session schema
const SessionSchema: Schema = new Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sessionToken: { type: String, required: true },
  expires: { type: Date, required: true },
  ipAddress: { type: String },
  deviceInfo: { type: String }
});

// Create and export the Session model (keep only this one declaration)
export const Session = mongoose.model<ISession>('Session', SessionSchema);

// Define the IUser interface with methods
export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  name: string;
  image?: string;
  status: UserStatus;
  statusMessage?: string;
  isEmailVerified: boolean;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
  // Add method definitions
  isPasswordCorrect(password: string): Promise<boolean>;
  generateAccessToken(): string;
  generateRefreshToken(): string;
}

// Define the User schema
export const UserSchema: Schema = new Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String},
  name: { type: String, required: true },
  image: { type: String },
  status: { type: String, required: true },
  statusMessage: { type: String },
  isEmailVerified: { type: Boolean, default: false },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
}, { timestamps: true });

// Hash password before saving
UserSchema.pre<IUser>('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

// Add default avatar if image is not provided
UserSchema.pre<IUser>('save', function(next) {
  if (!this.image) {
    this.image = `https://ui-avatars.com/api/?name=${encodeURIComponent(this.name || this.username)}&background=random&color=fff&size=200`;
  }
  next();
});

// Method to compare passwords
UserSchema.methods.isPasswordCorrect = async function (password: string): Promise<boolean> {
  return await bcrypt.compare(password, this.password);
};

// Method to generate access token
UserSchema.methods.generateAccessToken = function (): string {
  return jwt.sign(
    { _id: this._id, email: this.email, username: this.username },
    process.env.ACCESS_TOKEN_SECRET || '' as Secret,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "1d" } as SignOptions
  );
};

// Method to generate refresh token
UserSchema.methods.generateRefreshToken = function (): string {
  return jwt.sign(
    { _id: this._id },
    process.env.REFRESH_TOKEN_SECRET || '' as Secret,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "7d" } as SignOptions
  );
};

export const User = mongoose.model<IUser>('User', UserSchema);
