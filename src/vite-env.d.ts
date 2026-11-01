/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_GOOGLE_CLIENT_ID?: string;
    readonly VITE_STORAGE?: string;
    readonly VITE_AWS_REGION?: string;
    readonly VITE_S3_BUCKET?: string;
    readonly VITE_COGNITO_IDENTITY_POOL_ID?: string;
    readonly VITE_AZURE_UPLOAD_URL_ENDPOINT?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
