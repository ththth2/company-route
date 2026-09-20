import 'dotenv/config';
import {loadConfig} from './config.js';
import {createApp} from './app.js';
const config = loadConfig();
const server = createApp(config).listen(config.PORT,'0.0.0.0',() => console.log('API listening on port '+config.PORT));
for (const signal of ['SIGTERM','SIGINT']) process.on(signal,() => {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1),10000).unref();
});
