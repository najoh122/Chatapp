const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production';
const DB_FILE = path.join(__dirname, 'data.json');

// Tiny JSON "database" (we'll swap for a real one later)
let db = { users: [], messages: [] };
if (fs.existsSync(DB_FILE)) db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
const save = () => fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
const publicUser = (u) => ({ id: u.id, username: u.username });
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));

// ---- Auth ----
const sign = (u) => jwt.sign({ id: u.id, username: u.username }, SECRET, { expiresIn: '7d' });

function auth(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Not authorised' });
  }
}

app.post('/api/register', async (req, res) => {
  const username = (req.body.username || '').trim();
  const password = req.body.password || '';
  if (username.length < 3 || password.length < 4)
    return res.status(400).json({ error: 'Username min 3 chars, password min 4 chars' });
  if (db.users.some((u) => u.username.toLowerCase() === username.toLowerCase()))
    return res.status(409).json({ error: 'Username already taken' });
  const user = { id: newId(), username, hash: await bcrypt.hash(password, 10) };
  db.users.push(user);
  save();
  res.json({ token: sign(user), user: publicUser(user) });
});

app.post('/api/login', async (req, res) => {
  const { username = '', password = '' } = req.body;
  const user = db.users.find((u) => u.username.toLowerCase() === username.trim().toLowerCase());
  if (!user || !(await bcrypt.compare(password, user.hash)))
    return res.status(401).json({ error: 'Wrong username or password' });
  res.json({ token: sign(user), user: publicUser(user) });
});

app.get('/api/users', auth, (req, res) => {
  res.json(db.users.filter((u) => u.id !== req.user.id).map(publicUser));
});

app.get('/api/messages/:otherId', auth, (req, res) => {
  const me = req.user.id;
  const other = req.params.otherId;
  res.json(
    db.messages.filter(
      (m) => (m.from === me && m.to === other) || (m.from === other && m.to === me)
    )
  );
});

// ---- Real-time ----
const online = new Map();

io.use((socket, next) => {
  try {
    socket.user = jwt.verify(socket.handshake.auth.token, SECRET);
    next();
  } catch {
    next(new Error('Not authorised'));
  }
});

io.on('connection', (socket) => {
  const me = socket.user.id;
  socket.join(me);
  online.set(me, (online.get(me) || 0) + 1);
  io.emit('presence', [...online.keys()]);

  socket.on('message', ({ to, text }) => {
    text = (text || '').toString().trim().slice(0, 2000);
    if (!text || !db.users.some((u) => u.id === to)) return;
    const msg = { id: newId(), from: me, to, text, time: new Date().toISOString() };
    db.messages.push(msg);
    save();
    io.to(to).to(me).emit('message', msg);
  });

  socket.on('typing', ({ to }) => io.to(to).emit('typing', { from: me }));

  socket.on('disconnect', () => {
    const n = (online.get(me) || 1) - 1;
    if (n <= 0) online.delete(me);
    else online.set(me, n);
    io.emit('presence', [...online.keys()]);
  });
});

server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));