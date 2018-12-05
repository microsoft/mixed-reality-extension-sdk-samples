/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { ConsoleLogger, WebHost } from '@microsoft/mixed-reality-extension-sdk';
import { resolve as resolvePath } from 'path';
import SolarSystem from './app';

const logger = new ConsoleLogger();
logger.disable('debug', 'success');

 // Set up static file hosting, initialize adapter
const server = new WebHost({
    baseDir: resolvePath(__dirname, '../public'),
    port: 3901,
    logger
});

// When the webhost is set up, initialize the MRE system
server.adapter.onConnection(context => new SolarSystem(context, server.baseUrl));
