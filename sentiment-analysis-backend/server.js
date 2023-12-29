#!/usr/bin/env node

/**
 * Module dependencies.
 */

import app from './app.js';
import { createServer } from 'http';

/**
 * Get port from environment and store in Express.
 */

let port = process.env.PORT || 3000
let serverPort = 3001
app.set('port', port);
app.listen(port, () => {
  console.info(`Server is running on port ${port}`);
});


/**
 * Create HTTP server.
 */

let server = createServer(app);

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(serverPort);


