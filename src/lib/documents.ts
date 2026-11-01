// Pure helpers for naming and organizing tax documents. No I/O here, so it's easy to test.

export const CATEGORIES = ['W-2', '1099', '1098', 'Receipts', 'Other'] as const;
export type Category = (typeof CATEGORIES)[number];

/** Best guess at a document's category from its file name; the user can change it. */
export function guessCategory(fileName: string): Category {
    const name = fileName.toLowerCase().replace(/[\s_]+/g, '-');
    if (/\bw-?2\b/.test(name)) return 'W-2';
    if (name.includes('1099')) return '1099';
    if (name.includes('1098')) return '1098';
    if (/receipt|invoice/.test(name)) return 'Receipts';
    return 'Other';
}

/** Most people file for last year, so that's the default. */
export function defaultTaxYear(today = new Date()): number {
    return today.getFullYear() - 1;
}

export function taxYearOptions(today = new Date()): number[] {
    const year = today.getFullYear();
    return [year, year - 1, year - 2, year - 3];
}

/** Folder path, relative to the storage root, where a document is filed. */
export function folderFor(taxYear: number, category: Category): string[] {
    return [String(taxYear), category];
}

export interface GoogleProfile {
    name: string;
    email: string;
    picture?: string;
    /** Expiry in milliseconds since the epoch. */
    expiresAt: number;
}

/** Reads the profile claims out of a Google ID token (a JWT). It does not verify the signature. */
export function decodeIdToken(idToken: string): GoogleProfile {
    const payload = idToken.split('.')[1];
    if (!payload) throw new Error('Not a JWT');
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const claims = JSON.parse(new TextDecoder().decode(bytes));
    return {
        name: claims.name ?? claims.email,
        email: claims.email,
        picture: claims.picture,
        expiresAt: claims.exp * 1000,
    };
}
