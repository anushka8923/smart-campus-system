import mongoose from 'mongoose';
import { env } from './env.js';

function isPlaceholderMongoUri(uri) {
  return uri.includes('username:password') || uri.includes('cluster.mongodb.net');
}

export async function connectDB() {
  if (!env.MONGODB_URI) {
    console.warn('Skipping MongoDB connection because MONGODB_URI is missing.');
    return;
  }

  if (isPlaceholderMongoUri(env.MONGODB_URI)) {
    console.warn('Skipping MongoDB connection because MONGODB_URI is still the example value.');
    console.warn('Replace it in server/.env with your real MongoDB Atlas connection string.');
    return;
  }

  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log('MongoDB connected');
  } catch (error) {
    if (env.NODE_ENV !== 'production') {
      console.warn(`MongoDB connection failed: ${error.message}`);
      console.warn('API started without database. Add a valid MONGODB_URI in server/.env.');
      return;
    }

    throw error;
  }
}
