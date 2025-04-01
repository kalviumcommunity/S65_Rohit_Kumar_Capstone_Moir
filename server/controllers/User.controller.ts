import { Request, Response } from "express";
import { User, Session, IUser } from "../models/User.model";
import passport from "passport";
import bcrypt from "bcryptjs";

export interface AuthRequest extends Request {
  user: IUser; 
}

// Generate Access and Refresh Tokens
const generateAccessAndRefreshTokens = async (
  userId: string | unknown,
  req?: Request | AuthRequest
) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    await Session.create({
      userId: user._id,
      sessionToken: refreshToken,
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      ipAddress: req?.ip || "",
      deviceInfo: req?.headers["user-agent"] || "",
    });
    return { accessToken, refreshToken };
  } catch (error) {
    console.error("Error generating tokens:", error);
    throw new Error("Error generating tokens");
  }
};

export const registerUser = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { email, password, username } = req.body;

    if (!email || !password || !username) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ message: "Email or username already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      email,
      password: hashedPassword,
      username,
      name: username, 
      status: 'online' 
    });

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);
    
    res.cookie("accessToken", accessToken, { httpOnly: true });
    res.cookie("refreshToken", refreshToken, { httpOnly: true });
    
    return res.status(201).json({ 
      message: "User registered successfully",
      user: { id: user._id, email: user.email, username: user.username }
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ 
      message: "Error registering user",
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const loginUser = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id, req);
    
    res.cookie("accessToken", accessToken, { httpOnly: true });
    res.cookie("refreshToken", refreshToken, { httpOnly: true });

    return res.status(200).json({
      message: "Logged in successfully",
      user: { id: user._id, email: user.email, username: user.username }
    });
  } catch (error) {
    return res.status(500).json({ message: "Error logging in" });
  }
};

export const logoutUser = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
      await Session.deleteOne({ sessionToken: refreshToken });
    }
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    return res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Error logging out" });
  }
};

export const getCurrentUser = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json(user);
  } catch (error) {
    return res.status(500).json({ message: "Error fetching user" });
  }
};

export const getUserById = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json(user);
  } catch (error) {
    return res.status(500).json({ message: "Error fetching user" });
  }
};

export const getAllUsers = async (_req: AuthRequest, res: Response): Promise<Response | void> => {
  try {
    const users = await User.find().select("-password");
    return res.status(200).json(users);
  } catch (error) {
    return res.status(500).json({ message: "Error fetching users" });
  }
};

export const searchUsers = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  try {
    const query = req.query.q as string;
    if (!query) {
      return res.status(400).json({ message: "Search query is required" });
    }

    const users = await User.find({
      $or: [
        { username: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } }
      ],
      _id: { $ne: req.user._id }
    }).select("-password");

    return res.status(200).json(users);
  } catch (error) {
    return res.status(500).json({ message: "Error searching users" });
  }
};

export const googleAuth = passport.authenticate("google", {
  scope: ["profile", "email"]
});

export const googleAuthCallback = (req: Request, res: Response): void => {
  passport.authenticate("google", async (err: Error, user: any) => {
    if (err || !user) {
      return res.redirect(`${process.env.CLIENT_URL}/login?error=auth-failed`);
    }
    try {
      const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id, req);
      
      res.cookie("accessToken", accessToken, { httpOnly: true });
      res.cookie("refreshToken", refreshToken, { httpOnly: true });
      
      res.redirect(`${process.env.CLIENT_URL}/dashboard`);
    } catch (error) {
      res.redirect(`${process.env.CLIENT_URL}/login?error=token-generation-failed`);
    }
  })(req, res);
};

export const getDashboard = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    return res.status(200).json({
      user,
      message: "Dashboard data retrieved successfully"
    });
  } catch (error) {
    return res.status(500).json({ message: "Error fetching dashboard data" });
  }
};