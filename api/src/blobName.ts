export class BadRequestError extends Error {}

// One path segment: 1-200 chars, no slashes or control characters, and not ending
// in "." (which also rules out "." and ".."; Azure discourages trailing dots).
// eslint-disable-next-line no-control-regex
const SEGMENT = /^[^/\\\u0000-\u001f\u007f]{1,200}$/;
const MAX_FOLDER_DEPTH = 5;

/** Builds "users/<userId>/<folder...>/<fileName>", rejecting anything that could escape the user's prefix. */
export function blobNameFor(userId: string, folder: unknown, fileName: unknown): string {
    if (!Array.isArray(folder) || folder.length === 0 || folder.length > MAX_FOLDER_DEPTH) {
        throw new BadRequestError(`folder must be an array of 1-${MAX_FOLDER_DEPTH} names`);
    }
    const parts: unknown[] = [...folder, fileName];
    for (const part of parts) {
        if (typeof part !== 'string' || !SEGMENT.test(part) || part.endsWith('.') || part.trim() !== part) {
            throw new BadRequestError(`Invalid folder or file name: ${JSON.stringify(part)}`);
        }
    }
    return ['users', userId, ...(parts as string[])].join('/');
}
