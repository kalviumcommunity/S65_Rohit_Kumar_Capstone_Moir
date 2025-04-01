import express, { RequestHandler } from 'express';
import {
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  getFriendRequests,
  getFriends
} from '../controllers/FriendRequest.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = express.Router();

// All friend request routes are protected
router.use(authMiddleware as RequestHandler);

// Friend request actions
router.post('/send', sendFriendRequest as RequestHandler);
router.put('/:requestId/accept', acceptFriendRequest as RequestHandler);
router.put('/:requestId/decline', declineFriendRequest as RequestHandler);

// Friend request retrieval
router.get('/', getFriendRequests as RequestHandler);
router.get('/friends', getFriends as RequestHandler);

export default router;