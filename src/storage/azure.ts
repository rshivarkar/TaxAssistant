import type { DocumentStore } from './types';

/**
 * Saves files to Azure Blob Storage at <container>/users/<google-sub>/<year>/<category>/.
 *
 * For each file, the upload-url Azure Function (see api/) checks the Google ID token
 * and returns a 15-minute SAS URL that can write only that one blob. The browser
 * then PUTs the file straight to Blob Storage. No Azure SDK is needed here.
 */
export function createAzureStore(idToken: string, uploadUrlEndpoint: string): DocumentStore {
    async function failure(res: Response, what: string): Promise<Error> {
        const text = await res.text();
        let detail = text;
        try {
            detail = JSON.parse(text).error ?? text;
        } catch {
            // Not JSON (Azure Storage errors are XML); keep the raw text.
        }
        return new Error(`${what} failed (${res.status}): ${detail}`);
    }

    return {
        label: 'Azure Blob Storage',

        async connect() {
            if (!uploadUrlEndpoint) {
                throw new Error('Azure storage is not configured. Set VITE_AZURE_UPLOAD_URL_ENDPOINT.');
            }
        },

        async upload(file, folder) {
            const res = await fetch(uploadUrlEndpoint, {
                method: 'POST',
                headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ folder, fileName: file.name }),
            }).catch(() => {
                // Network failures and CORS rejections both surface as a bare "Failed to fetch".
                throw new Error('Could not reach the upload service. Check VITE_AZURE_UPLOAD_URL_ENDPOINT and the function app CORS settings.');
            });
            if (!res.ok) throw await failure(res, 'Getting an upload URL');
            const { uploadUrl } = (await res.json()) as { uploadUrl: string };

            const put = await fetch(uploadUrl, {
                method: 'PUT',
                headers: {
                    'x-ms-blob-type': 'BlockBlob',
                    'x-ms-blob-content-type': file.type || 'application/octet-stream',
                },
                body: file,
            });
            if (!put.ok) throw await failure(put, 'Uploading to Azure');
        },
    };
}
