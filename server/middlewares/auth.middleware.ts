// import { Response, NextFunction } from 'express';
// import jwt from 'jsonwebtoken';
// import { User } from '../models/User.model';
// import { AuthRequest } from '../types/auth.types';

// export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response> => {
//   try {
//     // Get token from cookie first, then try Authorization header as fallback
//     const token = req.cookies?.accessToken || (req.headers.authorization?.startsWith('Bearer ') 
//       ? req.headers.authorization.split(' ')[1] 
//       : null);
    
//     if (!token) {
//       return res.status(401).json({ message: 'Unauthorized: No token provided' });
//     }
    
//     const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET as string) as { _id: string };
//     const user = await User.findById(decoded._id).select('-password');
    
//     if (!user) {
//       return res.status(401).json({ message: 'Unauthorized: Invalid token' });
//     }
    
//     req.user = user;
//     next();
//   } catch (error) {
//     return res.status(401).json({ message: 'Unauthorized: Invalid token' });
//   }
// };