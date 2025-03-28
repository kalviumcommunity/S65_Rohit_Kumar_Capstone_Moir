import express, { RequestHandler } from 'express';
import {
  getCurrentUser,
  getUserById,
  getAllUsers,
  searchUsers,
  googleAuth,
  googleAuthCallback,
  getDashboard
} from '../controllers/User.controller';

const router = express.Router();


// User profile routes
router.get('/me', getCurrentUser as RequestHandler);

// User search and retrieval
router.get('/search', searchUsers as RequestHandler);
router.get('/all', getAllUsers as RequestHandler);
router.get('/dashboard', getDashboard as RequestHandler);
router.get('/:id', getUserById as RequestHandler);

router.get('/', getAllUsers as RequestHandler);

export default router;
