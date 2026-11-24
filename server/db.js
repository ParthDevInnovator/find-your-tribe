import mongoose from 'mongoose';

export async function connectDB() {
  let uri = process.env.MONGO_URI;
  if (!uri) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('MONGO_URI is required in production');
    }
    // Dev fallback: throwaway in-memory MongoDB (data resets on restart).
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const mem = await MongoMemoryServer.create();
    uri = mem.getUri();
    console.log('[db] MONGO_URI not set — using in-memory MongoDB (data resets on restart)');
  }
  await mongoose.connect(uri);
  console.log('[db] connected');
}
