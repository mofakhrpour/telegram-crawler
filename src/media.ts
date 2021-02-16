import fs from 'fs';
import mmm from 'mmmagic';
import { v4 as uuidv4 } from 'uuid';


export class Media {

    id?: number | string; // ID
    has_stickers?: boolean; // Whether the photo has mask stickers attached to it
    // access_hash?: number; // Access hash -- not supported
    // file_reference?: number[]; // Access hash -- not supported
    date?: number; // Date of upload
    // sizes?: PhotoSize[]; // Available sizes for download -- not supported
    // video_sizes?: VideoSize[]; // For animated profiles, the MPEG4 videos -- not supported
    // dc_id?: number; // DC ID to use for download -- not supported


    uuid: string;
    // private mimeType;

    constructor(id: string, date?: number, uuid?: string) {
        this.id = id;
        this.date = date;

        const files = fs.readdirSync('media/');
        const searchResult = files.find(x => x.endsWith('::' + id + '::' + date + '::D'));

        if (searchResult) {
            const uuidOld = searchResult.split('::')[0];
            this.uuid = uuidOld;
        } else {
            this.uuid = uuid ? uuid : uuidv4();
        }
    }

    static createMediaFormUUID(uuid: string) {

        const files = fs.readdirSync('media/');
        const searchResult = files.find(x => x.startsWith(uuid + '::') && x.endsWith('::D'));

        if (!searchResult) return undefined;

        const vars = searchResult.split('::');

        return new Media(vars[1], Number.parseInt(vars[2]), uuid);
    }

    write(bytes, bytesSize: number) {
        try {
            const isDuplicated = this.isDuplicated;
            if (isDuplicated) {
                const originalUUID = isDuplicated.split('::')[0];
                this.uuid = originalUUID;
                this.cancelDownload();
                return true;
            }

            fs.appendFileSync(this.fileBasePath + "::P", bytes);

            if (bytesSize == fs.statSync(this.fileBasePath + "::P").size) {
                fs.renameSync(this.fileBasePath + "::P", this.fileBasePath + "::D")
            }

            return true;
        } catch (error) {
            return error;
        }
    }

    cancelDownload() {
        try {
            if (fs.existsSync(this.fileBasePath + '::P')) {
                fs.unlinkSync(this.fileBasePath + '::P');
                console.log('Download Canceled:', this.fileBasePath);
            }
        } catch (error) {
            console.log("Error Canceling Download and Remove file:", error);
        }
    }

    get isDownloaded() {
        const filename = fs.readdirSync('media/').find(x => x.endsWith(this.id + '::' + this.date + '::D'));
        return filename != undefined;
    }

    get isDuplicated() {
        const filename = fs.readdirSync('media/').find(x => x.endsWith(this.id + '::' + this.date + '::D') && !x.startsWith(this.uuid));
        return filename;
    }

    get fileBasePath() {
        return 'media/' + this.uuid + '::' + this.id + '::' + this.date;
    }

    get fileFullPath() {
        return this.fileBasePath + '::D';
    }

    get readFileStream() {
        return fs.createReadStream(this.fileFullPath);
    }

    async mimeType(): Promise<string> {
        const magic = new mmm.Magic(mmm.MAGIC_MIME_TYPE);
        return await new Promise((resolve, reject) => {
            magic.detectFile(this.fileFullPath, (err, res) => {
                if (err) reject(err);
                else resolve(res);
            })
        });
    }
}