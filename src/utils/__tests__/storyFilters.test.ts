import { describe, it, expect } from 'vitest';
import {
    normalizeCategoryFilterValue,
    normalizeCategoryFilterKey,
    normalizeCategoryFilterList,
    normalizeTagFilterValue,
    buildCategoryFilterPath,
    buildTagFilterPath,
    matchesCategoryFilter,
    matchesTagFilter
} from '../storyFilters';

describe('storyFilters', () => {
    it('normalizes category values', () => {
        expect(normalizeCategoryFilterValue(' Test Category ')).toBe('Test Category');
        expect(normalizeCategoryFilterValue(null)).toBe('');
    });

    it('normalizes category keys', () => {
        expect(normalizeCategoryFilterKey(' Test Category ')).toBe('test category');
    });

    it('normalizes category list', () => {
        expect(normalizeCategoryFilterList(['A', 'b', ' A '])).toEqual(['A', 'b']);
        expect(normalizeCategoryFilterList([], 'fallback')).toEqual(['fallback']);
    });

    it('normalizes tag values', () => {
        expect(normalizeTagFilterValue('#tag')).toBe('tag');
        expect(normalizeTagFilterValue('tag')).toBe('tag');
    });

    it('builds category path', () => {
        expect(buildCategoryFilterPath('Action')).toBe('/stories?category=Action');
        expect(buildCategoryFilterPath(null)).toBe('/stories');
    });

    it('builds tag path', () => {
        expect(buildTagFilterPath('#hero')).toBe('/stories?tag=hero');
        expect(buildTagFilterPath(null)).toBe('/stories');
    });

    it('matches category filters', () => {
        expect(matchesCategoryFilter('Action', 'action', ['Action'])).toBe(true);
        expect(matchesCategoryFilter('Drama', 'action', ['Drama'])).toBe(false);
    });

    it('matches tag filters', () => {
        expect(matchesTagFilter(['hero', 'magic'], 'magic')).toBe(true);
        expect(matchesTagFilter(['hero'], 'magic')).toBe(false);
    });
});
