import { describe, it, expect } from 'vitest';
import { slugify } from '../slugify';

describe('slugify', () => {
    it('slugifies basic english text', () => {
        expect(slugify('Hello World')).toBe('hello-world');
        expect(slugify('Some Title Here!')).toBe('some-title-here');
    });

    it('slugifies Bangla text', () => {
        expect(slugify('আমার সোনার বাংলা')).toBe('আমার-সোনার-বাংলা');
    });

    it('handles special characters', () => {
        expect(slugify('test @#$ string')).toBe('test-string');
        expect(slugify('---test---')).toBe('test');
    });

    it('handles edge cases', () => {
        expect(slugify('')).toBe('');
        expect(slugify('   ')).toBe('');
        expect(slugify(' - ')).toBe('');
    });
});
