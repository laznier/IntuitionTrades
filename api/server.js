// server.js: This creates an Express app and uses the router from social-proxy.js
const express = require('express');
const socialProxy = require('./social-proxy');

const app = express();

// If you want to do /api/social, mount the router on "/"
// Then the full path is /api/social inside Vercel
app.use('/', socialProxy);

// Export the entire Express app as a module.
// Vercel's @vercel/node runtime will treat this as a serverless function entry point.
module.exports = app;
