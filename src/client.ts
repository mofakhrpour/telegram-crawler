import { api_hash, api_id } from './config';

import { Media } from './media';
import { Message } from './message';
import { MTProto } from '@mtproto/core';


interface MediaInfo {
    id?,
    accessHash?,
    reference?,
    thumb?,
    size?,
    type?,
    isPhoto?,
    date?
}

export class Client {

    private channelId;
    private channelAccessHash;
    private mtProto;

    constructor(channelId, channelAccessHash) {
        this.channelId = channelId;
        this.channelAccessHash = channelAccessHash;
        this.mtProto = new MTProto({
            api_id,
            api_hash,
        });

        this.init();
    }

    private init() {
        this.mtProto.setDefaultDc(4);
        this.mtProto.updateInitConnectionParams({
            app_version: '10.0.0',
        });
    }

    async messages(limit: number ,offsetId?: number, offsetDate?: number, skip?: number) {

        try {
            const messageHistory = await this.mtProto.call('messages.getHistory', {
                peer: {
                    _: 'inputPeerChannel',
                    channel_id: this.channelId,
                    access_hash: this.channelAccessHash
                },
                cdn_supported: true,
                limit: limit,
                add_offset: skip,
                offset_id: offsetId,
                offset_date: offsetDate
            });

            const messageList: Message[] = [];

            for (let i = 0; i < messageHistory.messages.length; i++) {
                const message = messageHistory.messages[i];

                const messageModel: Message = {
                    message: message.message,
                    date: message.date,
                    edit_date: message.edit_date,
                    forwards: message.forwards,
                    from_scheduled: message.from_scheduled,
                    edit_hide: message.edit_hide,
                    grouped_id: message.grouped_id,
                    id: message.id,
                    legacy: message.legacy,
                    mentioned: message.mentioned,
                    out: message.out,
                    pinned: message.pinned,
                    post: message.post,
                    post_author: message.post_author,
                    silent: message.silent,
                    views: message.views,

                    from_id: message.from_id,
                    peer_id: message.peer_id,
                    fwd_from: message.fwd_from,
                    reply_to: message.reply_to
                }

                if (message.media) {
                    const media = message.media;
                    this.cacheMedia(media, messageModel);
                }

                messageList.push(messageModel);
            }

            return messageList;
        } catch (error) {
            console.log('messages.getHistory Error:', error);
            // return error;
        }
    }

    media(uuid: string) {
        return Media.createMediaFormUUID(uuid);
    }

    async getChannelInfo(username: string) {
        try {
            const channelInfo = await this.mtProto.call('contacts.resolveUsername', {
                username: username,
            });
            return channelInfo;
        } catch (error) {
            console.log('contacts.resolveUsername Error:', error);
            return error;
        }
    }

    async getCode(phone: string) {
        try {
            const codeResult = await this.mtProto.call('auth.sendCode', {
                phone_number: phone,
                settings: {
                    _: 'codeSettings',
                },
            });
            return codeResult;
        } catch (error) {
            console.log('auth.sendCode Error:', error);
            return error;
        }
    }

    async submitCode(code: string, phone: string, codeHash: string) {
        try {
            await this.mtProto.call('auth.signIn', {
                phone_code: code,
                phone_number: phone,
                phone_code_hash: codeHash,
            });
            return { state: 'logged in!' };
        } catch (error) {
            console.log('auth.signIn Error:', error);
            return error;
        }
    }

    private cacheMedia(media: any, messageModel: Message) {
        const mediaType = media.photo ? 'photo' :
            media.document ? 'document' : null;

        var mediaBlock;
        var mediaInfo: MediaInfo = {};

        if (mediaType == 'photo') {
            mediaBlock = media.photo;
            mediaInfo.isPhoto = true;
            var biggest_size = mediaBlock.sizes.filter(x => x._ == 'photoSize');
            var biggest_size = biggest_size[biggest_size.length - 1];
            mediaInfo.size = biggest_size.size;
            mediaInfo.thumb = biggest_size.type;
            mediaInfo.date = mediaBlock.date;
            mediaInfo.type = 'image/jpeg';
        }
        else if (mediaType == 'document') {
            mediaBlock = media.document;
            mediaInfo.isPhoto = false;
            mediaInfo.size = mediaBlock.size;
            mediaInfo.thumb = null;
            mediaInfo.date = mediaBlock.date;
            mediaInfo.type = mediaBlock.mime_type;
            // file.thumb = file_block.thumbs[file_block.thumbs.length - 1].type;
        }

        if (mediaBlock) {
            mediaInfo.id = mediaBlock.id;
            mediaInfo.accessHash = mediaBlock.access_hash;
            mediaInfo.reference = mediaBlock.file_reference;

            const mediaObj = new Media(mediaInfo.id, this.channelId);
            messageModel.media = mediaObj;

            this.downloadFile(mediaObj, mediaInfo);
        }
    }

    private async downloadFile(media: Media, mediaInfo: MediaInfo, downloadOffset: number = 0, dcId: number = 0) {

        if (media.isDownloaded) return;

        try {
            var result = await this.mtProto.call('upload.getFile', {
                location: {
                    _: mediaInfo.isPhoto ? 'inputPhotoFileLocation' : 'inputDocumentFileLocation',
                    id: mediaInfo.id,
                    access_hash: mediaInfo.accessHash,
                    file_reference: mediaInfo.reference,
                    thumb_size: mediaInfo.thumb
                },
                offset: downloadOffset,
                limit: 1024 * 1024,
                precise: true
            }, dcId ? { dcId: dcId } : undefined);

            // console.log(`image:`, result);

            var mediaWriteState = media.write(result.bytes, mediaInfo.size);

            if (mediaWriteState == true) {
                if (mediaInfo.size - result.bytes.length - downloadOffset != 0 && !media.isDuplicated) {
                    const nextOffset = downloadOffset + (1024 * 1024);
                    await this.downloadFile(media, mediaInfo, nextOffset);
                }
            } else {
                console.log('MediaWriteState:', mediaWriteState);
            }

        } catch (err) {
            console.log('upload.getFile Error:', err);
            if (err.error_message && err.error_message.startsWith('FLOOD_WAIT_')) {
                const targetSec = err.error_message.replace('FLOOD_WAIT_','');
                await new Promise(resolve => setTimeout(resolve, targetSec*1000));
                await this.downloadFile(media, mediaInfo, downloadOffset);
            }else if (err.error_message && err.error_message.startsWith('FILE_MIGRATE_')) {
                const tarrgetDcId = err.error_message.replace('FILE_MIGRATE_','');
                await this.downloadFile(media, mediaInfo, downloadOffset, Number.parseInt(tarrgetDcId));
            }else {
                media.cancelDownload();
            }
        }
    }
}