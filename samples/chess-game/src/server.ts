/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

// Read .env if file exists
import dotenv from 'dotenv';
dotenv.config();

import { log, WebHost } from '@microsoft/mixed-reality-extension-sdk';
import { resolve as resolvePath } from 'path';
import App from './app';

process.on('uncaughtException', err => console.log('uncaughtException', err));
process.on('unhandledRejection', reason => console.log('unhandledRejection', reason));

log.enable('app');

// Start listening for connections, and serve static files
const server = new WebHost({
    // baseUrl: 'http://<ngrok-id>.ngrok.io',
    baseDir: resolvePath(__dirname, '../public')
});

// Handle new application sessions
server.adapter.onConnection(context => new App(context, server.baseUrl));
