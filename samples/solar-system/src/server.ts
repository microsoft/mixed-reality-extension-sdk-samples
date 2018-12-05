/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { ConsoleLogger, WebHost } from '@microsoft/mixed-reality-extension-sdk';
import { resolve as resolvePath } from 'path';
import SolarSystem from './app';

process.on('uncaughtException', (err) => console.log('uncaughtException', err));
process.on('unhandledRejection', (reason) => console.log('unhandledRejection', reason));

const logger = new ConsoleLogger();
// logger.disable('debug', 'success');

 // Start listening for connections, and serve static files
const server = new WebHost({
    baseDir: resolvePath(__dirname, '../public'),
    logger
});

// Handle new application sessions
server.adapter.onConnection(context => new SolarSystem(context, server.baseUrl));
