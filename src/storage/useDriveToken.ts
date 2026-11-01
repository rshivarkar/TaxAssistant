import { useCallback, useRef } from 'react';
import { useGoogleLogin } from '@react-oauth/google';

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

interface Pending {
    resolve: (token: string) => void;
    reject: (error: Error) => void;
}

/**
 * Returns a function that gets a Google Drive access token, asking for consent
 * the first time (and again after the token expires). Sign-in itself doesn't ask
 * for Drive access, so S3 users never see that prompt.
 */
export function useDriveToken(email: string): () => Promise<string> {
    const cached = useRef<{ token: string; expiresAt: number } | null>(null);
    const pending = useRef<Pending | null>(null);

    const settle = (outcome: { token: string } | { error: Error }) => {
        const p = pending.current;
        pending.current = null;
        if (!p) return;
        if ('token' in outcome) p.resolve(outcome.token);
        else p.reject(outcome.error);
    };

    const requestToken = useGoogleLogin({
        scope: DRIVE_SCOPE,
        hint: email,
        onSuccess: (response) => {
            cached.current = {
                token: response.access_token,
                // Refresh a minute early.
                expiresAt: Date.now() + (response.expires_in - 60) * 1000,
            };
            settle({ token: response.access_token });
        },
        onError: (response) =>
            settle({ error: new Error(response.error_description ?? 'Google Drive access was not granted.') }),
        onNonOAuthError: (error) =>
            settle({
                error: new Error(
                    error.type === 'popup_closed'
                        ? 'The Google window was closed before access was granted.'
                        : 'Could not open the Google window. Allow popups for this site and try again.',
                ),
            }),
    });

    return useCallback(() => {
        const current = cached.current;
        if (current && Date.now() < current.expiresAt) return Promise.resolve(current.token);
        return new Promise<string>((resolve, reject) => {
            pending.current = { resolve, reject };
            requestToken();
        });
    }, [requestToken]);
}
