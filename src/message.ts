import { Media } from './media';

export class Message {

    out?: boolean; // Is this an outgoing message
    mentioned?: boolean; // Whether we were mentioned in this message
    silent?: boolean; // Whether this is a silent message (no notification triggered)
    post?: boolean; // Whether this is a channel post
    from_scheduled?: boolean; // Whether this is a scheduled message
    legacy?: boolean; // This is a legacy message: it has to be refetched with the new layer
    edit_hide?: boolean; // Whether the message should be shown as not modified to the user, even if an edit date is present
    pinned?: boolean; // Whether this message is pinned
    id?: number; // ID of the message
    from_id?: any // Peer; // ID of the sender of the message -- type not supported
    peer_id?: any // Peer; // Peer ID, the chat where this message was sent -- type not supported
    fwd_from?: any // MessageFwdHeader; // Info about forwarded messages -- type not supported
    // via_bot_id?: number; // ID of the inline bot that generated the message -- not supported
    reply_to?: any // MessageReplyHeader; // Reply information -- type not supported
    date?: number; // Date of the message
    message: string; // The message
    media?: Media; // Media attachment
    // reply_markup?: ReplyMarkup; // Reply markup (bot/inline keyboards) -- not supported
    // entities?: MessageEntity[]; // Message entities for styled text -- not supported
    views?: number; // View count for channel posts
    forwards?: number; // Forward counter
    // replies?: MessageReplies; // Info about post comments (for channels) or message replies (for groups) -- not supported
    edit_date?: number; // Last edit date of this message
    post_author?: string; // Name of the author of this message for channel posts (with signatures enabled)
    grouped_id?: number; // Multiple media messages sent using messages.sendMultiMedia with the same grouped ID indicate an album or media group
    // restriction_reason?: RestrictionReason[]; // Contains the reason why access to this message must be restricted. -- not supported

    
    constructor(message: string){
        this.message = message;
    }
}
