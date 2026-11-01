import type { DocumentStore } from './types';

const FILES_API = 'https://www.googleapis.com/drive/v3/files';
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id';
const FOLDER_MIME = 'application/vnd.google-apps.folder';
const ROOT_FOLDER = 'TaxAssistant';

/**
 * Saves files to "TaxAssistant/<year>/<category>" in the user's own Google Drive.
 * Uses the drive.file scope, so the app can only see files and folders it created.
 */
export function createDriveStore(getAccessToken: () => Promise<string>): DocumentStore {
    let token = '';
    // Promises, not ids, so parallel uploads never create the same folder twice.
    const folderIds = new Map<string, Promise<string>>();

    async function drive<T>(url: string, init: RequestInit = {}): Promise<T> {
        const res = await fetch(url, {
            ...init,
            headers: { ...init.headers, Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Google Drive error ${res.status}: ${await res.text()}`);
        return res.json();
    }

    async function findOrCreateFolder(name: string, parentId: string): Promise<string> {
        const escaped = name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        const q = `name = '${escaped}' and mimeType = '${FOLDER_MIME}' and '${parentId}' in parents and trashed = false`;
        const found = await drive<{ files: { id: string }[] }>(
            `${FILES_API}?q=${encodeURIComponent(q)}&fields=files(id)&spaces=drive`,
        );
        if (found.files.length > 0) return found.files[0].id;

        const created = await drive<{ id: string }>(`${FILES_API}?fields=id`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, mimeType: FOLDER_MIME, parents: [parentId] }),
        });
        return created.id;
    }

    function folderId(path: string[]): Promise<string> {
        const key = path.join('/');
        let id = folderIds.get(key);
        if (!id) {
            const parent = path.length > 1 ? folderId(path.slice(0, -1)) : Promise.resolve('root');
            id = parent.then((parentId) => findOrCreateFolder(path[path.length - 1], parentId));
            folderIds.set(key, id);
            id.catch(() => folderIds.delete(key));
        }
        return id;
    }

    return {
        label: 'your Google Drive',

        async connect() {
            token = await getAccessToken();
        },

        async upload(file, folder) {
            const parentId = await folderId([ROOT_FOLDER, ...folder]);
            const boundary = `taxassistant-${crypto.randomUUID()}`;
            const metadata = JSON.stringify({ name: file.name, parents: [parentId] });
            const body = new Blob([
                `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`,
                `--${boundary}\r\nContent-Type: ${file.type || 'application/octet-stream'}\r\n\r\n`,
                file,
                `\r\n--${boundary}--`,
            ]);
            await drive(UPLOAD_API, {
                method: 'POST',
                headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
                body,
            });
        },
    };
}
