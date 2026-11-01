import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAzureStore } from './azure';

const ENDPOINT = 'https://fn.example.net/api/upload-url';
const SAS_URL = 'https://acct.blob.core.windows.net/tax-documents/users/1/2025/W-2/a.pdf?sig=x';

afterEach(() => vi.unstubAllGlobals());

describe('createAzureStore', () => {
    it('asks the function for a SAS URL, then PUTs the file to it', async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(Response.json({ uploadUrl: SAS_URL }))
            .mockResolvedValueOnce(new Response(null, { status: 201 }));
        vi.stubGlobal('fetch', fetchMock);

        const file = new File(['%PDF'], 'a.pdf', { type: 'application/pdf' });
        const store = createAzureStore('id-token', ENDPOINT);
        await store.connect();
        await store.upload(file, ['2025', 'W-2']);

        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe(ENDPOINT);
        expect(init.headers.Authorization).toBe('Bearer id-token');
        expect(JSON.parse(init.body)).toEqual({ folder: ['2025', 'W-2'], fileName: 'a.pdf' });

        const [putUrl, putInit] = fetchMock.mock.calls[1];
        expect(putUrl).toBe(SAS_URL);
        expect(putInit.method).toBe('PUT');
        expect(putInit.headers).toEqual({
            'x-ms-blob-type': 'BlockBlob',
            'x-ms-blob-content-type': 'application/pdf',
        });
        expect(putInit.body).toBe(file);
    });

    it('surfaces the function error message', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ error: 'Invalid Google ID token' }, { status: 401 })));
        const store = createAzureStore('expired', ENDPOINT);

        await expect(store.upload(new File(['x'], 'a.pdf'), ['2025'])).rejects.toThrow(
            'Getting an upload URL failed (401): Invalid Google ID token',
        );
    });

    it('explains network and CORS failures', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
        const store = createAzureStore('id-token', ENDPOINT);

        await expect(store.upload(new File(['x'], 'a.pdf'), ['2025'])).rejects.toThrow('Could not reach the upload service');
    });

    it('refuses to connect when the endpoint is not configured', async () => {
        await expect(createAzureStore('id-token', '').connect()).rejects.toThrow('VITE_AZURE_UPLOAD_URL_ENDPOINT');
    });
});
