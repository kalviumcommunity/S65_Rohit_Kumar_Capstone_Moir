import { Response } from "express";
import { FriendRequest, FriendRequestStatus } from "../models/FriendRequest.model";
import { User, IUser } from "../models/User.model";
import { AuthRequest } from "./User.controller";
import { Chat } from "../models/Chat.model";
import { Notification, NotificationType } from "../models/Notification.model";
import { emitNotification } from "../services/socket.service";
// Add import for the AI message generation
import { generateFriendRequestMessage } from "../services/ai/mizuki-recommendations.service";

// Send a friend request
export const sendFriendRequest = async (
  req: AuthRequest,
  res: Response
): Promise<Response | void> => {
  try {
    const { usernameOrEmail } = req.body;
    
    if (!usernameOrEmail) {
      return res.status(400).json({ message: "usernameOrEmail is required" });
    }
    
    let receiver;
    
    // Find user by username/email
    receiver = await User.findOne({
      $or: [
        { username: usernameOrEmail },
        { email: usernameOrEmail }
      ]
    }) as IUser;
    
    // Check if receiver exists
    if (!receiver) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Prevent sending request to self
    if ((receiver._id as any).toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "You cannot send a friend request to yourself" });
    }

    // Check if a request already exists
    const existingRequest = await FriendRequest.findOne({
      $or: [
        { senderId: req.user._id, receiverId: receiver._id },
        { senderId: receiver._id, receiverId: req.user._id }
      ]
    });

    if (existingRequest) {
      if (existingRequest.status === FriendRequestStatus.PENDING) {
        return res.status(400).json({ message: "A friend request already exists between these users" });
      } else if (existingRequest.status === FriendRequestStatus.ACCEPTED) {
        return res.status(400).json({ message: "You are already friends with this user" });
      } else if (existingRequest.status === FriendRequestStatus.DECLINED) {
        // If previously declined, update to pending
        existingRequest.status = FriendRequestStatus.PENDING;
        existingRequest.senderId = req.user._id;
        // Fix: Use the correct type for receiver._id
        existingRequest.receiverId = receiver._id as any;
        await existingRequest.save();
        
        // Create notification for the receiver
        await Notification.create({
          userId: receiver._id,
          type: NotificationType.FRIEND_REQUEST,
          content: `${req.user.username} sent you a friend request`,
          read: false,
          relatedId: existingRequest._id,
          refModel: 'FriendRequest'  // Add this line to fix the validation error
        });
        
        return res.status(200).json(existingRequest);
      }
    }

    // Create new friend request
    // Generate AI message based on user's music taste
    let customMessage = "";
    try {
      console.log("Generating friend request message...");
      // Fix: Cast receiver._id to the correct type
      customMessage = await generateFriendRequestMessage(req.user._id.toString(), (receiver._id as any).toString());
      console.log("Generated message:", customMessage);
    } catch (error) {
      console.error("Error generating friend request message:", error);
      customMessage = `Hey there! I'd love to connect with you on MOIR.`;
    }

    const friendRequest = await FriendRequest.create({
      senderId: req.user._id,
      receiverId: receiver._id,
      status: FriendRequestStatus.PENDING,
      message: customMessage
    });

    // Create notification for the receiver with the custom message
    await Notification.create({
      userId: receiver._id,
      type: NotificationType.FRIEND_REQUEST,
      content: `${req.user.username} sent you a friend request: "${customMessage}"`,
      read: false,
      relatedId: friendRequest._id,
      refModel: 'FriendRequest'
    });

    res.status(201).json(friendRequest);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Accept a friend request
export const acceptFriendRequest = async (
  req: AuthRequest,
  res: Response
): Promise<Response | void> => {
  try {
    const { requestId } = req.params;

    const friendRequest = await FriendRequest.findById(requestId);
    if (!friendRequest) {
      return res.status(404).json({ message: "Friend request not found" });
    }

    // Check if the current user is the receiver of the request
    if (friendRequest.receiverId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to accept this request" });
    }

    // Update request status
    friendRequest.status = FriendRequestStatus.ACCEPTED;
    await friendRequest.save();

    // Check if a chat already exists between these users
    let chat = await Chat.findOne({
      users: { $all: [friendRequest.senderId, friendRequest.receiverId] },
      isGroup: false
    });

    // If no chat exists, create a new one
    if (!chat) {
      chat = await Chat.create({
        users: [friendRequest.senderId, friendRequest.receiverId],
        isGroup: false
      });
    }

    // Get sender's username for notification
    const sender = await User.findById(friendRequest.senderId);
    const senderUsername = sender ? sender.username : "A user";

    // Create notification for the sender
    const senderNotification = await Notification.create({
      userId: friendRequest.senderId,
      type: NotificationType.FRIEND_ACCEPTED,
      content: `${req.user.username} accepted your friend request`,
      read: false,
      relatedId: chat._id,
      refModel: 'Chat'
    });
    
    // Create notification for the receiver (current user) as well
    const receiverNotification = await Notification.create({
      userId: req.user._id,
      type: NotificationType.FRIEND_ACCEPTED,
      content: `You are now friends with ${senderUsername}`,
      read: false,
      relatedId: chat._id,
      refModel: 'Chat'
    });

    // Get the global io instance
    const io = global.io;
    if (io) {
      // Populate the notifications before sending
      const populatedSenderNotification = await Notification.findById(senderNotification._id)
        .populate("relatedId");
      
      const populatedReceiverNotification = await Notification.findById(receiverNotification._id)
        .populate("relatedId");
        
      // Emit notifications to both users
      await emitNotification(io, friendRequest.senderId.toString(), populatedSenderNotification);
      await emitNotification(io, req.user._id.toString(), populatedReceiverNotification);
    }

    res.status(200).json({ friendRequest, chat });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Decline a friend request
export const declineFriendRequest = async (
  req: AuthRequest,
  res: Response
): Promise<Response | void> => {
  try {
    const { requestId } = req.params;

    const friendRequest = await FriendRequest.findById(requestId);
    if (!friendRequest) {
      return res.status(404).json({ message: "Friend request not found" });
    }

    // Check if the current user is the receiver of the request
    if (friendRequest.receiverId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to decline this request" });
    }

    // Update request status
    friendRequest.status = FriendRequestStatus.DECLINED;
    await friendRequest.save();

    // Removed notification creation and emission code

    res.status(200).json(friendRequest);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Get all friend requests for the current user
export const getFriendRequests = async (
  req: AuthRequest,
  res: Response
): Promise<Response | void> => {
  try {
    // Get incoming requests (where user is receiver)
    const incomingRequests = await FriendRequest.find({
      receiverId: req.user._id,
      status: FriendRequestStatus.PENDING
    }).populate("senderId", "username name image");

    // Get outgoing requests (where user is sender)
    const outgoingRequests = await FriendRequest.find({
      senderId: req.user._id,
      status: FriendRequestStatus.PENDING
    }).populate("receiverId", "username name image");

    // Return only incoming and outgoing requests (removed friends)
    res.status(200).json({
      incoming: incomingRequests,
      outgoing: outgoingRequests
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Cancel a friend request
export const cancelFriendRequest = async (
  req: AuthRequest,
  res: Response
): Promise<Response | void> => {
  try {
    const { requestId } = req.params;

    const friendRequest = await FriendRequest.findById(requestId);
    if (!friendRequest) {
      return res.status(404).json({ message: "Friend request not found" });
    }

    // Check if the current user is the sender of the request
    if (friendRequest.senderId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to cancel this request" });
    }

    // Delete the request
    await FriendRequest.findByIdAndDelete(requestId);

    res.status(200).json({ message: "Friend request cancelled successfully" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Remove a friend
export const removeFriend = async (
  req: AuthRequest,
  res: Response
): Promise<Response | void> => {
  try {
    const { friendId } = req.params;

    // Find and delete the friend request
    await FriendRequest.findOneAndDelete({
      $or: [
        { senderId: req.user._id, receiverId: friendId, status: FriendRequestStatus.ACCEPTED },
        { senderId: friendId, receiverId: req.user._id, status: FriendRequestStatus.ACCEPTED }
      ]
    });

   

    res.status(200).json({ message: "Friend removed successfully" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Get all friends for the current user
export const getFriends = async (
  req: AuthRequest,
  res: Response
): Promise<Response | void> => {
  try {
    // Get accepted requests (friends)
    const friendRequests = await FriendRequest.find({
      $or: [
        { senderId: req.user._id },
        { receiverId: req.user._id }
      ],
      status: FriendRequestStatus.ACCEPTED
    })
      .populate("senderId", "username name image status")
      .populate("receiverId", "username name image status");

    // Transform the data to get just the friend information
    const friendsPromises = friendRequests.map(async request => {
      // Determine which user is the friend (not the current user)
      // Type assertion to tell TypeScript these are populated User objects
      const sender = request.senderId as unknown as IUser;
      const receiver = request.receiverId as unknown as IUser;
      
      // Fix: Use as any for type assertion on _id property
      const isSender = (sender._id as any).toString() === req.user._id.toString();
      const friend = isSender ? receiver : sender;
      
      // Find the chat between these users
      const chat = await Chat.findOne({
        users: { $all: [req.user._id, friend._id] },
        isGroup: false
      });
      
      return {
        friendId: friend._id,
        username: friend.username,
        name: friend.name,
        image: friend.image,
        status: friend.status,
        friendRequestId: request._id,
        chatId: chat?._id // Include the chat ID in the response
      };
    });
    
    const friends = await Promise.all(friendsPromises);

    res.status(200).json(friends);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};