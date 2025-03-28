import express, { RequestHandler } from 'express';
import {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  getUserById,
  getAllUsers,
  searchUsers,
  googleAuth,
  googleAuthCallback,
  getDashboard
} from '../controllers/User.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = express.Router();

// Public routes
router.post('/register', registerUser as RequestHandler);
router.post('/login', loginUser as RequestHandler);
router.get('/auth/google', googleAuth as RequestHandler);
router.get('/auth/google/callback', googleAuthCallback as RequestHandler);

// Protected routes
router.use(authMiddleware as RequestHandler);

// User profile routes
router.get('/me', getCurrentUser as RequestHandler);
router.post('/logout', logoutUser as RequestHandler);

// User search and retrieval
router.get('/search', searchUsers as RequestHandler);
router.get('/all', getAllUsers as RequestHandler);
router.get('/dashboard', getDashboard as RequestHandler);
router.get('/:id', getUserById as RequestHandler);

export default router;