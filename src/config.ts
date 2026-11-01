// All settings come from VITE_* environment variables (see .env.example).
// Nothing here is secret: OAuth client IDs and Cognito pool IDs are public by design.

export type StorageKind = 'drive' | 's3' | 'azure';

const env = import.meta.env;

function storageKind(value: string | undefined): StorageKind {
    return value === 's3' || value === 'azure' ? value : 'drive';
}

export const config = {
    googleClientId:
        // `||`, not `??`: unset GitHub Actions variables arrive as empty strings.
        env.VITE_GOOGLE_CLIENT_ID ||
        '875045284124-gsibf02t4dbmf60070n7h62j0d5t0tuk.apps.googleusercontent.com',
    storage: storageKind(env.VITE_STORAGE),
    aws: {
        region: env.VITE_AWS_REGION ?? '',
        bucket: env.VITE_S3_BUCKET ?? '',
        identityPoolId: env.VITE_COGNITO_IDENTITY_POOL_ID ?? '',
    },
    azure: {
        /** URL of the upload-url function in api/, e.g. https://<app>.azurewebsites.net/api/upload-url */
        uploadUrlEndpoint: env.VITE_AZURE_UPLOAD_URL_ENDPOINT ?? '',
    },
};

export type AwsConfig = typeof config.aws;
