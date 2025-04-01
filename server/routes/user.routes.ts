import express, { RequestHandler } from 'express';
import {
  registerUser,
  loginUser,
  getUserById,
  getAllUsers
} from '../controllers/User.controller';

const router = express.Router();

// Public routes only
router.post('/register', registerUser as RequestHandler);
router.post('/login', loginUser as RequestHandler);
router.get('/all', getAllUsers as unknown as RequestHandler);
router.get('/:id', getUserById as RequestHandler);

export default router;