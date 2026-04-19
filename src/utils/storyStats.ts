import type { Story } from './storyManager';

export function estimateReadMinutes(story: Story): number {
    const partsWordCount = (story.parts || []).reduce(
        (acc, p) => acc + ((p as { content?: string }).content || '').split(/\s+/).filter(Boolean).length,
        0
    );
    const contentWordCount = (story.content || '').split(/\s+/).filter(Boolean).length;
    const totalWords = partsWordCount || contentWordCount;
    return Math.max(1, Math.round(totalWords / 220));
}
