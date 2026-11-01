import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { fromCognitoIdentityPool } from '@aws-sdk/credential-provider-cognito-identity';
import type { AwsConfig } from '../config';
import type { DocumentStore } from './types';

/**
 * Saves files to s3://<bucket>/users/<identity-id>/<year>/<category>/.
 *
 * There's no backend. A Cognito Identity Pool trades the Google ID token for
 * short-lived AWS credentials, and its IAM role only allows writes under the
 * caller's own users/<identity-id>/ prefix (see README).
 */
export function createS3Store(idToken: string, aws: AwsConfig): DocumentStore {
    const credentials = fromCognitoIdentityPool({
        identityPoolId: aws.identityPoolId,
        logins: { 'accounts.google.com': idToken },
        clientConfig: { region: aws.region },
    });
    const client = new S3Client({
        region: aws.region,
        credentials,
        // Browsers can't stream-hash a File body; S3 doesn't need a checksum for PutObject.
        requestChecksumCalculation: 'WHEN_REQUIRED',
    });
    let identityId = '';

    return {
        label: `Amazon S3 (${aws.bucket})`,

        async connect() {
            identityId = (await credentials()).identityId;
        },

        async upload(file, folder) {
            await client.send(
                new PutObjectCommand({
                    Bucket: aws.bucket,
                    Key: ['users', identityId, ...folder, file.name].join('/'),
                    Body: file,
                    ContentType: file.type || 'application/octet-stream',
                }),
            );
        },
    };
}
