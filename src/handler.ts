import { Callback, Context, Handler } from 'aws-lambda';
import { createServer, proxy } from 'aws-serverless-express';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '@modules/app.module';
import { NestExpressApplication, ExpressAdapter } from '@nestjs/platform-express';
import { eventContext } from 'aws-serverless-express/middleware'
import { INestApplication } from '@nestjs/common';
import { Server } from 'http';
import express = require('express');

// resolution from: https://github.com/nestjs/nest/issues/238
let cachedServer: Server;

// NOTE: If you get ERR_CONTENT_DECODING_FAILED in your browser, this
// is likely due to a compressed response (e.g. gzip) which has not
// been handled correctly by aws-serverless-express and/or API
// Gateway. Add the necessary MIME types to binaryMimeTypes below
const binaryMimeTypes: string[] = [];

function bootstrapServer(): Promise<Server> {
  const expressApp = express();
  return NestFactory.create<NestExpressApplication>(AppModule, new ExpressAdapter(expressApp))
    .then((app: INestApplication) => {
      app.use(eventContext());
      app.init();
    })
    .then(() => createServer(expressApp));

}

export const handler: Handler = async (event: any, context: Context) => {
  if (!cachedServer) {
    cachedServer = await bootstrapServer();
  }
  return proxy(cachedServer, event, context, 'PROMISE').promise;
};
