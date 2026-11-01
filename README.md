# TaxAssistant

A small static web app for collecting tax documents. Sign in with Google, drop in W-2s, 1099s,
1098s and receipts, and each file is saved under its tax year and type:

```
<tax year>/<W-2 | 1099 | 1098 | Receipts | Other>/<file name>
```

The browser uploads files straight to one of three places, chosen at build time:

| `VITE_STORAGE` | Files go to | Credentials |
|---|---|---|
| `drive` (default) | `TaxAssistant/<year>/<type>/` in the **user's own Google Drive** | Google access token with the `drive.file` scope (the app sees only files it created) |
| `s3` | `s3://<bucket>/users/<identity-id>/<year>/<type>/` | Short-lived AWS credentials from a Cognito Identity Pool, in exchange for the Google ID token |
| `azure` | `<container>/users/<google-id>/<year>/<type>/` in Azure Blob Storage | A 15-minute, write-only SAS URL per file, issued by a small Azure Function (`api/`) after it verifies the Google ID token |

Drive and S3 need no server code. Azure needs the one function in `api/`, because Azure has no way to
turn a Google sign-in into storage credentials in the browser, and a SAS token shipped in the site
would let anyone write anywhere.

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
    azure.ts             Azure Blob store: asks api/ for a SAS URL, then PUTs the file
    useDriveToken.ts     asks for Drive access the first time you save

api/                     Azure Function (only for VITE_STORAGE=azure)
  src/functions/uploadUrl.ts   POST /api/upload-url: verify Google token, return a SAS URL
  src/blobName.ts              keeps every blob under users/<google-id>/
  src/sas.ts                   signs the SAS (managed identity, or an account key)
```

To add another destination (Dropbox and so on), implement `DocumentStore` and add it in
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

## Azure Blob Storage setup

1. **Storage account and container.** Create a storage account (Standard, StorageV2) and a
   private container, e.g. `tax-documents`. Keep *Allow Blob anonymous access* off. Under
   **Resource sharing (CORS) → Blob service**, add:

   | Allowed origins | Methods | Allowed headers | Exposed headers | Max age |
   |---|---|---|---|---|
   | `http://localhost:5173`, `https://<user>.github.io` | `PUT` | `x-ms-blob-type,x-ms-blob-content-type,content-type` | `etag` | `3600` |

2. **Function app.** Create a Function App (Node.js 22, Flex Consumption or Consumption plan) and
   deploy `api/`:

   ```bash
   cd api
   npm ci && npm run build
   func azure functionapp publish <function-app-name>
   ```

   App settings:

   | Setting | Value |
   |---|---|
   | `GOOGLE_CLIENT_ID` | Same client ID as the frontend. Tokens for other clients are rejected. |
   | `AZURE_STORAGE_ACCOUNT` | Storage account name |
   | `AZURE_STORAGE_CONTAINER` | Container name (default `tax-documents`) |
   | `AZURE_STORAGE_KEY` | Leave unset (recommended): see step 3. Or the account key. |

   Under the function app's **CORS**, add the same origins as in step 1.

3. **Permissions (recommended: no keys).** Turn on the function app's system-assigned managed
   identity and give it the **Storage Blob Delegator** role on the storage account and
   **Storage Blob Data Contributor** on the container. The function then signs SAS URLs with a
   user delegation key, and no storage key is stored anywhere.

4. Set `VITE_STORAGE=azure` and
   `VITE_AZURE_UPLOAD_URL_ENDPOINT=https://<function-app-name>.azurewebsites.net/api/upload-url`.

Each SAS URL can only create or overwrite one blob at `users/<google-id>/<year>/<type>/<file>`,
over HTTPS, for 15 minutes. It can't read, list or delete. Consider soft delete and versioning on
the container so an overwrite can be undone.

To run the function locally: copy `api/local.settings.example.json` to `api/local.settings.json`,
fill it in (with `az login` done, or `AZURE_STORAGE_KEY` set), then run `npm start` in `api/`.
It requires [Azure Functions Core Tools](https://learn.microsoft.com/azure/azure-functions/functions-run-local).
Point `VITE_AZURE_UPLOAD_URL_ENDPOINT` at `http://localhost:7071/api/upload-url`.

## Deploy

`.github/workflows/deploy.yml` runs the frontend and `api/` tests, builds, and publishes the site to
GitHub Pages on every push to `main`. It doesn't deploy the Azure Function; publish that with
`func azure functionapp publish` as above. Put the `VITE_*` values in **Settings → Secrets and variables → Actions → Variables**.
