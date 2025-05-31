// server.js
//  Node.js server for two-party translate chat using LibreTranslate
//  --------------------------------------------------------------
//  Run:   npm install express socket.io node-fetch
//  Then:  node server.js

const express = require('express');
const http    = require('http');
const io      = require('socket.io');
const fetch   = require('node-fetch');

const app = express();
const server = http.createServer(app);
const socket = io(server);

const PORT = process.env.PORT || 3000;

// Serve the static HTML client
app.use(express.static(__dirname + '/public')); 
// (You will create ./public/index.html and ./public/client.js below)

socket.on('connection', (sock) => {
  console.log(`Client connected: ${sock.id}`);

  // Join a “room” if client passes a room name; else default “main”
  sock.on('joinRoom', (room) => {
    sock.join(room);
    sock.room = room;
    console.log(`${sock.id} joined room ${room}`);
  });

  // When client A sends { text, fromLang, toLang }, translate and broadcast to others in the same room
  sock.on('translateMessage', async ({ text, fromLang, toLang }) => {
    if (!text || !fromLang || !toLang) return;

    // 1) Call LibreTranslate
    //    We’ll try three public mirrors until one works.
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
        if (!res.ok) continue;
        const data = await res.json();
        translated = data.translatedText || '';
        if (translated) break;
      } catch (e) {
        // try next endpoint
      }
    }

    // 2) Emit back to everyone *except* sender in this room
    socket.to(sock.room || 'main').emit('translatedMessage', {
      original: text,
      translated
    });
  });

  sock.on('disconnect', () => {
    console.log(`Client disconnected: ${sock.id}`);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
