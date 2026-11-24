import 'dotenv/config';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { Server } from 'socket.io';
import { connectDB } from './db.js';
import router from './routes.js';
import { setIO, channel } from './realtime.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 4000;
const isProd = process.env.NODE_ENV === 'production';

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(express.json({ limit: '20kb' }));

// Generous limit: a whole hostel can share one public IP.
app.use('/api', rateLimit({ windowMs: 60_000, limit: 1200, standardHeaders: 'draft-7', legacyHeaders: false }));
app.use('/api', router);
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

// Serve the built React app (single deployable service).
const dist = path.resolve(__dirname, '../client/dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist, {
    index: false,
    setHeaders: (res, file) => {
      if (file.includes(`${path.sep}assets${path.sep}`)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    },
  }));
  app.get('*', (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(dist, 'index.html'));
  });
}

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const status = err.status || (err.type === 'entity.parse.failed' ? 400 : 500);
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status < 500 ? err.message : 'Something went wrong, please try again' });
});

const server = http.createServer(app);
const io = new Server(server, isProd ? {} : { cors: { origin: true } });
io.on('connection', (socket) => {
  socket.on('room:watch', (code) => {
    if (typeof code === 'string' && /^[A-Z0-9]{4,8}$/.test(code)) socket.join(channel(code));
  });
});
setIO(io);

connectDB()
  .then(() => server.listen(PORT, () => console.log(`[server] Find Your Tribe running on http://localhost:${PORT}`)))
  .catch((err) => {
    console.error('[server] failed to start:', err);
    process.exit(1);
  });
