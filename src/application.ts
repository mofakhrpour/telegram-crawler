import { Client } from './client';

import fastify, { FastifyInstance } from 'fastify';
import { Server, IncomingMessage, ServerResponse } from 'http';

class Application {

    server: FastifyInstance<Server, IncomingMessage, ServerResponse>;
    tgClient: Client;

    constructor() {
        this.server = fastify({  });
        // this.tgClient = new Client(1014833787, '15106835826906163636');
        this.tgClient = new Client(1120396371, '13854406890949196598');

        this.routes();
    }

    build() {

        return this.server;
    }

    private routes() {

        this.server.get<any,any>('/fetch', async (request, reply) => {
            
            try {
                const limit = request.query.limit ? (request.query.limit > 100 ? 100 : request.query.limit) : 10;
                const skip = request.query.skip;
                const start_id = request.query.start_id;
                const start_date = request.query.start_date;
                
                var messages = await this.tgClient.messages(limit, start_id, start_date, skip);
                this.checkMediaDownloadStats(messages, () => {
                    reply.send(messages);
                });
            } catch (error) {
                console.log('Error: ', error);
                reply.send({ error: error });
            }

        })
        
        this.server.get<any,any>('/media/:uuid', async (request, reply) => {
            const media = this.tgClient.media(request.params.uuid);

            if (!media) reply.send("media not found");
            else if (!media.isDownloaded) reply.send("media download is in progress");
            else if (media.isDownloaded) reply.type(await media.mimeType()).send(media.readFileStream);
        })

        this.server.get<any,any>('/get-code/:phone', async (request, reply) => {

            const code = await this.tgClient.getCode(request.params.phone);

            reply.send(code.phone_code_hash ? {
                phone_code_hash: code.phone_code_hash,
                phone_code: 'sended to your telegram account'
            } : {error: code});
        })

        this.server.get<any,any>('/submit-code/:code/:phone/:codeHash', async (request, reply) => {

            const state = await this.tgClient.submitCode(request.params.code, request.params.phone, request.params.codeHash);

            reply.send(state);
        })

        this.server.get<any,any>('/username-info/:username', async (request, reply) => {

            const info = await this.tgClient.getChannelInfo(request.params.username);

            reply.send(info);
        })
    }
    
    private checkMediaDownloadStats(message, callback) {
        setTimeout(() => {
            var all_downloaded = true;
            for (let i = 0; i < message.length; i++) {
                if (message[i].media && !message[i].media.isDownloaded) {
                    all_downloaded = false;
                }
            }
            if (all_downloaded) {
                callback();
            }else{
                this.checkMediaDownloadStats(message, callback);
            }
        }, 100);
    }
}

const app = new Application();

function build() {
    return app.server;
}

export default build;