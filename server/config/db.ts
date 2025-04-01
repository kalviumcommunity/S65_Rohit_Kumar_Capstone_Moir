import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
  try {
    const connection = await mongoose.connect(process.env.MONGODB_URI as string);
    console.log(`MongoDB connected: ${connection.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection error:', error);
  }
};

export default connectDB;