import mongoose from 'mongoose';

// Tolerate common copy-paste mistakes in the dashboard value:
// surrounding quotes/whitespace or a leading "MONGO_URI=".
function cleanUri(raw) {
  const unquote = (s) => s.trim().replace(/^['"]|['"]$/g, '').trim();
  return unquote(unquote(raw || '').replace(/^MONGO_URI\s*=\s*/i, ''));
}

// Log the shape of the URI without leaking the password.
function maskUri(uri) {
  return uri.replace(/\/\/([^:/@]+):[^@]*@/, '//$1:****@').slice(0, 80);
}

export async function connectDB() {
  let uri = cleanUri(process.env.MONGO_URI);
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
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  } catch (err) {
    console.error(`[db] connection failed for MONGO_URI="${maskUri(uri)}..."`);
    throw err;
  }
  console.log('[db] connected');
}
