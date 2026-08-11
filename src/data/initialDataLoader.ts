type InitialDataModule = typeof import('./initialSiteData');

let initialDataPromise: Promise<InitialDataModule> | null = null;

const loadInitialData = () => {
    if (!initialDataPromise) {
        initialDataPromise = import('./initialSiteData');
    }
    return initialDataPromise;
};

export const loadInitialStories = async () => (await loadInitialData()).INITIAL_STORIES;
export const loadInitialAuthors = async () => (await loadInitialData()).INITIAL_AUTHORS;
export const loadInitialCategories = async () => (await loadInitialData()).INITIAL_CATEGORIES;
