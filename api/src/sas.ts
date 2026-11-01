import { DefaultAzureCredential } from '@azure/identity';
import {
    BlobSASPermissions,
    BlobServiceClient,
    SASProtocol,
    StorageSharedKeyCredential,
    generateBlobSASQueryParameters,
} from '@azure/storage-blob';
import type { BlobSASSignatureValues, UserDelegationKey } from '@azure/storage-blob';

export interface StorageSettings {
    account: string;
    container: string;
    /** Account key. Leave empty to sign with a user delegation key via managed identity (recommended). */
    key?: string;
}

const SAS_LIFETIME_MS = 15 * 60_000;
const CLOCK_SKEW_MS = 5 * 60_000;

let delegationKey: { key: UserDelegationKey; expiresAt: number } | undefined;

// A user delegation key can sign many SAS tokens, so fetch one per hour rather than per request.
async function getDelegationKey(settings: StorageSettings, now: number): Promise<UserDelegationKey> {
    if (delegationKey && now < delegationKey.expiresAt - SAS_LIFETIME_MS) return delegationKey.key;
    const service = new BlobServiceClient(
        `https://${settings.account}.blob.core.windows.net`,
        new DefaultAzureCredential(),
    );
    const expiresAt = now + 60 * 60_000;
    const key = await service.getUserDelegationKey(new Date(now - CLOCK_SKEW_MS), new Date(expiresAt));
    delegationKey = { key, expiresAt };
    return key;
}

/**
 * Returns a URL that can create or overwrite exactly one blob for the next 15 minutes,
 * over HTTPS only. It can't read, list or delete anything.
 */
export async function uploadUrlFor(settings: StorageSettings, blobName: string, now = Date.now()): Promise<string> {
    const values: BlobSASSignatureValues = {
        containerName: settings.container,
        blobName,
        permissions: BlobSASPermissions.parse('cw'),
        startsOn: new Date(now - CLOCK_SKEW_MS),
        expiresOn: new Date(now + SAS_LIFETIME_MS),
        protocol: SASProtocol.Https,
    };
    const sas = settings.key
        ? generateBlobSASQueryParameters(values, new StorageSharedKeyCredential(settings.account, settings.key))
        : generateBlobSASQueryParameters(values, await getDelegationKey(settings, now), settings.account);

    const path = [settings.container, ...blobName.split('/')].map(encodeURIComponent).join('/');
    return `https://${settings.account}.blob.core.windows.net/${path}?${sas.toString()}`;
}
