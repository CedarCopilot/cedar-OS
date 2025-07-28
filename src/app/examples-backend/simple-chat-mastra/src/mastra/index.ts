import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { chatAgent } from './agents/chatAgent';
import { apiRoutes } from './apiRegistry';

// Create Mastra instance
export const mastra = new Mastra({
	agents: { chatAgent },
	storage: new LibSQLStore({ url: ':memory:' }),
	logger: new PinoLogger(),
	server: {
		port: 4111,
		apiRoutes,
	},
});
