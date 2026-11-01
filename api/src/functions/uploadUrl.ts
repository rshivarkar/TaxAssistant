import { app } from '@azure/functions';
import type { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { BadRequestError, blobNameFor } from '../blobName.js';
import { UnauthorizedError, bearerToken, verifyGoogleIdToken } from '../googleAuth.js';
import { uploadUrlFor } from '../sas.js';

function requiredEnv(name: string): string {
    const value = process.env[name];
    if (!value) throw new Error(`App setting ${name} is not set`);
    return value;
}

/**
 * POST /api/upload-url
 * Authorization: Bearer <Google ID token>
 * Body: { "folder": ["2025", "W-2"], "fileName": "acme.pdf" }
 *
 * Returns { "uploadUrl": "<SAS URL>" } for users/<google-sub>/2025/W-2/acme.pdf.
 * The browser then PUTs the file to that URL.
 */
export async function uploadUrl(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const userId = await verifyGoogleIdToken(
            bearerToken(request.headers.get('authorization')),
            requiredEnv('GOOGLE_CLIENT_ID'),
        );
        const body = (await request.json().catch(() => null)) as { folder?: unknown; fileName?: unknown } | null;
        if (!body) throw new BadRequestError('Body must be JSON');

        const blobName = blobNameFor(userId, body.folder, body.fileName);
        const url = await uploadUrlFor(
            {
                account: requiredEnv('AZURE_STORAGE_ACCOUNT'),
                container: process.env.AZURE_STORAGE_CONTAINER || 'tax-documents',
                key: process.env.AZURE_STORAGE_KEY,
            },
            blobName,
        );
        return { jsonBody: { uploadUrl: url } };
    } catch (e) {
        if (e instanceof UnauthorizedError) return { status: 401, jsonBody: { error: e.message } };
        if (e instanceof BadRequestError) return { status: 400, jsonBody: { error: e.message } };
        context.error('upload-url failed', e);
        return { status: 500, jsonBody: { error: 'Could not create an upload URL' } };
    }
}

app.http('upload-url', { methods: ['POST'], authLevel: 'anonymous', handler: uploadUrl });
