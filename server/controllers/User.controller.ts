import { Request, Response } from "express";
import { User, UserStatus, Session, IUser } from "../models/User.model";
import passport from "passport"; // Add this import

export interface AuthRequest extends Request {
  user?: any;
}

// Generate Access and Refresh Tokens
const generateAccessAndRefreshTokens = async (
  userId: string | any,
  req?: Request | AuthRequest
) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    
    // Create a session with the refresh token (expires in 7 days)
    await Session.create({
      userId: user._id,
      sessionToken: refreshToken,
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      ipAddress: req?.ip || "",
      deviceInfo: req?.headers["user-agent"] || "",
    });

    return { accessToken, refreshToken };
  } catch (error) {
    console.error("Error generating tokens:", error);
    throw new Error("Error generating tokens");
  }
};

// Get Current User
export const getCurrentUser = async (
  req: AuthRequest,
  res: Response
): Promise<Response | void> => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json(user);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

// Get User by ID
export const getUserById = async (
  req: Request,
  res: Response
): Promise<Response | void> => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json(user);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

// Get All Users
export const getAllUsers = async (
  _req: AuthRequest,
  res: Response
): Promise<Response | void> => {
  try {
    const users = await User.find().select("-password").sort({ username: 1 });
    return res.status(200).json(users);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

// Search Users
export const searchUsers = async (
  req: AuthRequest,
  res: Response
): Promise<Response | void> => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ message: "Search query is required" });
    }

    const users = await User.find({
      $or: [
        { username: { $regex: query, $options: "i" } },
        { name: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
      ],
      _id: { $ne: req.user._id }, // Exclude current user
    }).select("-password");

    return res.status(200).json(users);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

// Temporary placeholder for getDashboard
export const getDashboard = async (
  req: AuthRequest,
  res: Response
): Promise<Response | void> => {
  try {
    // Return a simple response until you implement the real functionality
    return res.status(200).json({
      message: "Dashboard functionality not yet implemented",
      userId: req.user._id
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

// Google OAuth Login
export const googleAuth = passport.authenticate("google", {
  scope: ["profile", "email"],
});

// Google OAuth Callback
export const googleAuthCallback = (req: Request, res: Response) => {
  passport.authenticate("google", async (err: Error, user: any) => {
    if (err || !user) {
      return res.redirect(process.env.CLIENT_URL + "/login?error=auth-failed");
    }
    try {
      // Generate tokens for the authenticated Google user
      const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
        user._id,
        req
      );

      // Set tokens as cookies
      res.cookie("accessToken", accessToken, {
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000
      });
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      // Redirect to the client on successful authentication
      res.redirect(process.env.CLIENT_URL + "/auth/success");
    } catch (error) {
      res.redirect(process.env.CLIENT_URL + "/login?error=token-generation-failed");
    }
  })(req, res);
};