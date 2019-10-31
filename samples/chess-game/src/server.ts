/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

// Read .env if file exists
import dotenv from 'dotenv';
dotenv.config();

/* Sample .env file:
 *  PORT=80
 *  BASE_URL=http://<ngrok-id>.ngrok.io
 *  MRE_LOGGING=app:error,network,network-content
 */

import { WebHost } from '@microsoft/mixed-reality-extension-sdk';
import { resolve as resolvePath } from 'path';
import App from './app';

process.on('uncaughtException', err => console.log('uncaughtException', err));
process.on('unhandledRejection', reason => console.log('unhandledRejection', reason));

// Start listening for connections, and serve static files
const server = new WebHost({
	baseDir: resolvePath(__dirname, '../public')
});

// Handle new application sessions
server.adapter.onConnection(context => new App(context, server.baseUrl));
