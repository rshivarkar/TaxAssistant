import { describe, expect, it } from 'vitest';
import { decodeIdToken, defaultTaxYear, folderFor, guessCategory, taxYearOptions } from './documents';

describe('guessCategory', () => {
    it.each([
        ['W2_Acme_2025.pdf', 'W-2'],
        ['acme w-2.pdf', 'W-2'],
        ['1099-INT chase.pdf', '1099'],
        ['Form1098 mortgage.pdf', '1098'],
        ['costco-receipt.jpg', 'Receipts'],
        ['Invoice 123.pdf', 'Receipts'],
        ['passport.pdf', 'Other'],
        ['w22-notes.txt', 'Other'],
    ])('%s -> %s', (name, expected) => {
        expect(guessCategory(name)).toBe(expected);
    });
});

describe('tax years', () => {
    const today = new Date(2026, 10, 1);

    it('defaults to last year', () => {
        expect(defaultTaxYear(today)).toBe(2025);
    });

    it('offers this year and the three before it', () => {
        expect(taxYearOptions(today)).toEqual([2026, 2025, 2024, 2023]);
    });

    it('files by year then category', () => {
        expect(folderFor(2025, 'W-2')).toEqual(['2025', 'W-2']);
    });
});

describe('decodeIdToken', () => {
    // base64url, unpadded, as in a real JWT.
    const encode = (claims: object) =>
        btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(claims))))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

    it('reads profile claims, including non-ASCII names', () => {
        const token = `${encode({ alg: 'RS256' })}.${encode({
            name: 'Zoë Ångström',
            email: 'zoe@example.com',
            picture: 'https://example.com/p.png',
            exp: 1_800_000_000,
        })}.sig`;

        expect(decodeIdToken(token)).toEqual({
            name: 'Zoë Ångström',
            email: 'zoe@example.com',
            picture: 'https://example.com/p.png',
            expiresAt: 1_800_000_000_000,
        });
    });

    it('rejects things that are not JWTs', () => {
        expect(() => decodeIdToken('nope')).toThrow('Not a JWT');
    });
});
