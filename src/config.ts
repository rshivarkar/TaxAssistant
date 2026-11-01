// All settings come from VITE_* environment variables (see .env.example).
// Nothing here is secret: OAuth client IDs and Cognito pool IDs are public by design.

export type StorageKind = 'drive' | 's3';

const env = import.meta.env;

export const config = {
    googleClientId:
        // `||`, not `??`: unset GitHub Actions variables arrive as empty strings.
        env.VITE_GOOGLE_CLIENT_ID ||
        '875045284124-gsibf02t4dbmf60070n7h62j0d5t0tuk.apps.googleusercontent.com',
    storage: (env.VITE_STORAGE === 's3' ? 's3' : 'drive') as StorageKind,
    aws: {
        region: env.VITE_AWS_REGION ?? '',
        bucket: env.VITE_S3_BUCKET ?? '',
        identityPoolId: env.VITE_COGNITO_IDENTITY_POOL_ID ?? '',
    },
};

export type AwsConfig = typeof config.aws;
