import { createRemoteJWKSet, jwtVerify } from 'jose';

// jose caches these keys and refetches when Google rotates them.
const googleKeys = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));

export class UnauthorizedError extends Error {}

/** Reads the token from an "Authorization: Bearer <token>" header. */
export function bearerToken(header: string | null): string {
    const match = header?.match(/^Bearer\s+(\S+)$/i);
    if (!match) throw new UnauthorizedError('Missing Authorization: Bearer <Google ID token>');
    return match[1];
}

/** Verifies a Google ID token issued to our OAuth client and returns the user's stable id (`sub`). */
export async function verifyGoogleIdToken(idToken: string, clientId: string): Promise<string> {
    try {
        const { payload } = await jwtVerify(idToken, googleKeys, {
            issuer: ['https://accounts.google.com', 'accounts.google.com'],
            audience: clientId,
        });
        if (!payload.sub) throw new Error('Token has no sub claim');
        return payload.sub;
    } catch (e) {
        throw new UnauthorizedError(`Invalid Google ID token: ${e instanceof Error ? e.message : e}`);
    }
}
