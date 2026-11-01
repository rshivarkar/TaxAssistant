import { HttpRequest, InvocationContext } from '@azure/functions';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestError, blobNameFor } from './blobName.js';
import { UnauthorizedError, bearerToken } from './googleAuth.js';
import { uploadUrlFor } from './sas.js';

// Don't call Google: treat "good-token" as user 1234 and anything else as invalid.
vi.mock('./googleAuth.js', async (importOriginal) => {
    const actual = await importOriginal<typeof import('./googleAuth.js')>();
    return {
        ...actual,
        verifyGoogleIdToken: async (token: string) => {
            if (token !== 'good-token') throw new actual.UnauthorizedError('Invalid Google ID token');
            return '1234';
        },
    };
});

const { uploadUrl } = await import('./functions/uploadUrl.js');

const fakeKey = Buffer.from('not-a-real-key').toString('base64');

describe('blobNameFor', () => {
    it('puts files under the user prefix', () => {
        expect(blobNameFor('1234', ['2025', 'W-2'], 'Acme W2.pdf')).toBe('users/1234/2025/W-2/Acme W2.pdf');
    });

    it.each([
        ['path traversal', ['2025', '..'], 'a.pdf'],
        ['slash in name', ['2025'], '../other/a.pdf'],
        ['backslash', ['2025'], 'a\\b.pdf'],
        ['trailing dot', ['2025'], 'a.'],
        ['control char', ['2025'], 'a\nb.pdf'],
        ['leading space', ['2025'], ' a.pdf'],
        ['empty folder', [], 'a.pdf'],
        ['folder not array', '2025', 'a.pdf'],
        ['non-string file name', ['2025'], 42],
        ['too deep', ['a', 'b', 'c', 'd', 'e', 'f'], 'a.pdf'],
    ])('rejects %s', (_, folder, fileName) => {
        expect(() => blobNameFor('1234', folder, fileName)).toThrow(BadRequestError);
    });
});

describe('bearerToken', () => {
    it('reads the token', () => {
        expect(bearerToken('Bearer abc.def.ghi')).toBe('abc.def.ghi');
    });

    it.each([null, '', 'Basic abc', 'Bearer'])('rejects %j', (header) => {
        expect(() => bearerToken(header)).toThrow(UnauthorizedError);
    });
});

describe('uploadUrlFor', () => {
    it('signs a write-only, HTTPS-only URL for one blob that expires in 15 minutes', async () => {
        const now = Date.UTC(2026, 10, 1, 12, 0, 0);
        const url = new URL(
            await uploadUrlFor({ account: 'acct', container: 'tax-documents', key: fakeKey }, 'users/1234/2025/W-2/Acme W2.pdf', now),
        );

        expect(url.origin).toBe('https://acct.blob.core.windows.net');
        expect(url.pathname).toBe('/tax-documents/users/1234/2025/W-2/Acme%20W2.pdf');
        expect(url.searchParams.get('sp')).toBe('cw');
        expect(url.searchParams.get('sr')).toBe('b');
        expect(url.searchParams.get('spr')).toBe('https');
        expect(url.searchParams.get('se')).toBe('2026-11-01T12:15:00Z');
        expect(url.searchParams.get('sig')).toBeTruthy();
    });
});

describe('POST /api/upload-url', () => {
    beforeEach(() => {
        vi.stubEnv('GOOGLE_CLIENT_ID', 'client-id');
        vi.stubEnv('AZURE_STORAGE_ACCOUNT', 'acct');
        vi.stubEnv('AZURE_STORAGE_CONTAINER', 'tax-documents');
        vi.stubEnv('AZURE_STORAGE_KEY', fakeKey);
    });
    afterEach(() => vi.unstubAllEnvs());

    const call = (headers: Record<string, string>, body: unknown) =>
        uploadUrl(
            new HttpRequest({
                url: 'http://localhost/api/upload-url',
                method: 'POST',
                headers,
                body: { string: JSON.stringify(body) },
            }),
            new InvocationContext({ functionName: 'upload-url' }),
        );

    it('returns an upload URL for the signed-in user', async () => {
        const res = await call({ authorization: 'Bearer good-token' }, { folder: ['2025', 'W-2'], fileName: 'a.pdf' });
        expect(res.status).toBeUndefined();
        const { uploadUrl: url } = res.jsonBody as { uploadUrl: string };
        expect(new URL(url).pathname).toBe('/tax-documents/users/1234/2025/W-2/a.pdf');
    });

    it('returns 401 without a valid Google token', async () => {
        expect((await call({}, { folder: ['2025'], fileName: 'a.pdf' })).status).toBe(401);
        expect((await call({ authorization: 'Bearer bad' }, { folder: ['2025'], fileName: 'a.pdf' })).status).toBe(401);
    });

    it('returns 400 for names that would escape the user folder', async () => {
        const res = await call({ authorization: 'Bearer good-token' }, { folder: ['..', '9999'], fileName: 'a.pdf' });
        expect(res.status).toBe(400);
    });

    it('returns 500 without leaking details when misconfigured', async () => {
        vi.stubEnv('AZURE_STORAGE_ACCOUNT', '');
        const res = await call({ authorization: 'Bearer good-token' }, { folder: ['2025'], fileName: 'a.pdf' });
        expect(res).toEqual({ status: 500, jsonBody: { error: 'Could not create an upload URL' } });
    });
});
