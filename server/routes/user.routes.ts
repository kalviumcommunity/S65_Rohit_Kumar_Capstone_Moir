import express, { RequestHandler } from 'express';
import {
  registerUser,
  loginUser,
  getUserById,
  getAllUsers,
  googleAuth,
  googleAuthCallback
} from '../controllers/User.controller';

const router = express.Router();

router.get('/auth/google', googleAuth as RequestHandler);
router.get('/auth/google/callback', googleAuthCallback as RequestHandler);

// Public routes only
router.post('/register', registerUser as RequestHandler);
router.post('/login', loginUser as RequestHandler);
router.get('/all', getAllUsers as unknown as RequestHandler);
router.get('/:id', getUserById as RequestHandler);

export default router;