# TaxAssistant

A small static web app for collecting tax documents. Sign in with Google, drop in W-2s, 1099s,
1098s and receipts, and each file is saved under its tax year and type:

```
<tax year>/<W-2 | 1099 | 1098 | Receipts | Other>/<file name>
```

There's no backend. The browser uploads straight to one of two places, chosen at build time:

| `VITE_STORAGE` | Files go to | Credentials |
|---|---|---|
| `drive` (default) | `TaxAssistant/<year>/<type>/` in the **user's own Google Drive** | Google access token with the `drive.file` scope (the app sees only files it created) |
| `s3` | `s3://<bucket>/users/<identity-id>/<year>/<type>/` | Short-lived AWS credentials from a Cognito Identity Pool, in exchange for the Google ID token |

## Run it

```bash
npm install
cp .env.example .env.local   # then fill it in
npm run dev                  # http://localhost:5173/TaxAssistant/
npm test
npm run build
```

## Layout

```
src/
  main.tsx               providers
  App.tsx                Home when signed out, Uploader when signed in (no router)
  auth.tsx               Google sign-in state (ID token, in memory only)
  config.ts              reads VITE_* settings
  components/            Header, Home, Uploader
  lib/documents.ts       category guessing, tax years, folder paths (unit tested)
  storage/
    types.ts             DocumentStore interface: connect() + upload()
    drive.ts             Google Drive store
    s3.ts                Amazon S3 store (loaded only when used)
    useDriveToken.ts     asks for Drive access the first time you save
```

To add another destination (Azure Blob, Dropbox and so on), implement `DocumentStore` and add it in
`storage/index.ts`.

## Google setup

1. In Google Cloud Console, create an OAuth client of type **Web application**.
2. Under **Authorized JavaScript origins**, add `http://localhost:5173` and `https://<user>.github.io`.
3. For Drive storage, enable the **Google Drive API** in the same project.
4. Set `VITE_GOOGLE_CLIENT_ID`.

## Amazon S3 setup

1. **Bucket.** Create a bucket and leave *Block all public access* on. Add a CORS rule:

   ```json
   [{
     "AllowedOrigins": ["http://localhost:5173", "https://<user>.github.io"],
     "AllowedMethods": ["PUT"],
     "AllowedHeaders": ["*"],
     "ExposeHeaders": ["ETag"]
   }]
   ```

2. **Identity pool.** In Cognito, create an Identity Pool with **Google** as an identity provider and
   your Google client ID. Allow authenticated access only (no guest access).

3. **Role policy.** Give the pool's authenticated role permission to write only under its own prefix:

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [{
       "Effect": "Allow",
       "Action": "s3:PutObject",
       "Resource": "arn:aws:s3:::<bucket>/users/${cognito-identity.amazonaws.com:sub}/*"
     }]
   }
   ```

4. Set `VITE_STORAGE=s3`, `VITE_AWS_REGION`, `VITE_S3_BUCKET` and `VITE_COGNITO_IDENTITY_POOL_ID`.

Consider default encryption (SSE-S3 or SSE-KMS) and a lifecycle rule on the bucket. These are tax documents.

## Deploy

`.github/workflows/deploy.yml` runs the tests, builds, and publishes to GitHub Pages on every push to
`main`. Put the `VITE_*` values in **Settings → Secrets and variables → Actions → Variables**.
