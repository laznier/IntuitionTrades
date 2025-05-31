// server.js
// ────────────────────────────────────────────────────────────────────────────
// A simple Node.js + Express + Socket.IO server that listens for
// incoming “translateMessage” events from clients, calls LibreTranslate
// to translate the text (with fallback across three mirrors), and then
// emits the translated text back to the other clients in the same room.
//
// Place this file in the root of your project folder (i.e. alongside
// package.json and node_modules/, with a sibling "public" folder).
// Run:   npm install express socket.io node-fetch
//        node server.js
// ────────────────────────────────────────────────────────────────────────────

const express = require('express');
const http    = require('http');
const io      = require('socket.io');
const fetch   = require('node-fetch');

const app = express();
const server = http.createServer(app);
const socket = io(server);

// Choose a port (default 3000)
const PORT = process.env.PORT || 3000;

// ─── Serve static files from the “public” folder ────────────────────────────
//    So “public/index.html” and “public/client.js” will be served automatically.
app.use(express.static(__dirname + '/public'));

// ─── Handle WebSocket connections ───────────────────────────────────────────
socket.on('connection', (sock) => {
  console.log(`Client connected: ${sock.id}`);

  // Each client can “join” a room. By default, we’ll put everyone into “main” if they don't specify.
  sock.on('joinRoom', (room) => {
    sock.join(room);
    sock.room = room;
    console.log(`${sock.id} joined room ${room}`);
  });

  // When a client sends a message to translate, we call LibreTranslate
  // and then broadcast the result to everyone else in that same room.
  sock.on('translateMessage', async ({ 
    room, text, fromLang, toLang 
  }) => {
    if (!room || !text || !fromLang || !toLang) return;

    // Try these public LibreTranslate endpoints in sequence until one works:
    const ENDPOINTS = [
      'https://translate.terraprint.co/translate',
      'https://lt.vern.cc/translate',
      'https://libretranslate.de/translate'
    ];

    let translated = '';
    for (const url of ENDPOINTS) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            q:      text,
            source: fromLang,
            target: toLang,
            format: 'text'
          })
        });
        if (!res.ok) {
          console.warn(`[translate] ${url} returned status ${res.status}`);
          continue;
        }
        const data = await res.json();
        translated = data.translatedText || '';
        if (translated) break;
      } catch (err) {
        console.warn(`[translate] ${url} fetch error:`, err);
      }
    }

    // Emit the translated message to all OTHER clients in this room:
    socket.to(room).emit('translatedMessage', {
      original:   text,
      translated: translated,
      from:       sock.id
    });
  });

  sock.on('disconnect', () => {
    console.log(`Client disconnected: ${sock.id}`);
  });
});

// ─── Start the HTTP + WebSocket server ───────────────────────────────────────
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
