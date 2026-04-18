const normalizePlainText = (value?: string | null) => String(value ?? '').trim();

export const normalizeCategoryFilterValue = (value?: string | null) => normalizePlainText(value);

export const normalizeCategoryFilterKey = (value?: string | null) =>
    normalizeCategoryFilterValue(value).toLocaleLowerCase();

export const normalizeCategoryFilterList = (
    values: Array<string | null | undefined> | undefined,
    fallbackCategory?: string | null
) => {
    const seen = new Set<string>();
    const output: string[] = [];

    (values && values.length ? values : [fallbackCategory]).forEach((value) => {
        const normalizedValue = normalizeCategoryFilterValue(value);
        const normalizedKey = normalizeCategoryFilterKey(normalizedValue);
        if (!normalizedKey || seen.has(normalizedKey)) return;
        seen.add(normalizedKey);
        output.push(normalizedValue);
    });

    return output;
};

export const normalizeTagFilterValue = (value?: string | null) =>
    normalizePlainText(value).replace(/^#/, '');

export const normalizeTagFilterKey = (value?: string | null) =>
    normalizeTagFilterValue(value).toLocaleLowerCase();

export const buildCategoryFilterPath = (category?: string | null) => {
    const normalizedCategory = normalizeCategoryFilterValue(category);
    if (!normalizedCategory) return '/stories';
    return `/stories?category=${encodeURIComponent(normalizedCategory)}`;
};

export const buildTagFilterPath = (tag?: string | null) => {
    const normalizedTag = normalizeTagFilterValue(tag);
    if (!normalizedTag) return '/stories';
    return `/stories?tag=${encodeURIComponent(normalizedTag)}`;
};

export const formatTagLabel = (tag?: string | null) => {
    const normalizedTag = normalizeTagFilterValue(tag);
    if (!normalizedTag) return '#';
    return `#${normalizedTag}`;
};

export const matchesCategoryFilter = (
    storyCategory?: string | null,
    filterCategory?: string | null,
    storyCategories?: Array<string | null | undefined>
) => {
    const filterKey = normalizeCategoryFilterKey(filterCategory);
    if (!filterKey) return true;
    return normalizeCategoryFilterList(storyCategories, storyCategory)
        .some((category) => normalizeCategoryFilterKey(category) === filterKey);
};

export const matchesTagFilter = (
    storyTags: Array<string | null | undefined> | undefined,
    filterTag?: string | null
) => {
    const filterKey = normalizeTagFilterKey(filterTag);
    if (!filterKey) return true;

    return (storyTags || []).some((tag) => normalizeTagFilterKey(tag) === filterKey);
};
