import { config } from '../config';
import { createDriveStore } from './drive';
import type { DocumentStore } from './types';

export type { DocumentStore } from './types';

interface StoreOptions {
    idToken: string;
    idTokenExpiresAt: number;
    getDriveToken: () => Promise<string>;
}

/** Picks the store named by VITE_STORAGE. */
export function createStore(options: StoreOptions): DocumentStore {
    return config.storage === 's3' ? lazyS3Store(options) : createDriveStore(options.getDriveToken);
}

// The AWS SDK is large, so it's only downloaded when S3 is actually used.
function lazyS3Store({ idToken, idTokenExpiresAt }: StoreOptions): DocumentStore {
    const { aws } = config;
    let store: Promise<DocumentStore> | undefined;
    const load = () => (store ??= import('./s3').then((m) => m.createS3Store(idToken, aws)));

    return {
        label: `Amazon S3 (${aws.bucket})`,
        async connect() {
            if (!aws.region || !aws.bucket || !aws.identityPoolId) {
                throw new Error('S3 storage is not configured. Set VITE_AWS_REGION, VITE_S3_BUCKET and VITE_COGNITO_IDENTITY_POOL_ID.');
            }
            if (Date.now() >= idTokenExpiresAt) {
                throw new Error('Your sign-in has expired. Sign out and sign in again.');
            }
            await (await load()).connect();
        },
        async upload(file, folder) {
            await (await load()).upload(file, folder);
        },
    };
}
