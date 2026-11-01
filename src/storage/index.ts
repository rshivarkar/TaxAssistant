import { config } from '../config';
import { createAzureStore } from './azure';
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
    switch (config.storage) {
        case 's3':
            return requireFreshIdToken(lazyS3Store(options.idToken), options.idTokenExpiresAt);
        case 'azure':
            return requireFreshIdToken(
                createAzureStore(options.idToken, config.azure.uploadUrlEndpoint),
                options.idTokenExpiresAt,
            );
        default:
            return createDriveStore(options.getDriveToken);
    }
}

// S3 and Azure send the Google ID token to be checked, and it only lasts an hour.
function requireFreshIdToken(store: DocumentStore, expiresAt: number): DocumentStore {
    return {
        ...store,
        async connect() {
            if (Date.now() >= expiresAt) throw new Error('Your sign-in has expired. Sign out and sign in again.');
            await store.connect();
        },
    };
}

// The AWS SDK is large, so it's only downloaded when S3 is actually used.
function lazyS3Store(idToken: string): DocumentStore {
    const { aws } = config;
    let store: Promise<DocumentStore> | undefined;
    const load = () => (store ??= import('./s3').then((m) => m.createS3Store(idToken, aws)));

    return {
        label: `Amazon S3 (${aws.bucket})`,
        async connect() {
            if (!aws.region || !aws.bucket || !aws.identityPoolId) {
                throw new Error('S3 storage is not configured. Set VITE_AWS_REGION, VITE_S3_BUCKET and VITE_COGNITO_IDENTITY_POOL_ID.');
            }
            await (await load()).connect();
        },
        async upload(file, folder) {
            await (await load()).upload(file, folder);
        },
    };
}
