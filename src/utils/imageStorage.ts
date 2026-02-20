const normalizeFolder = (value?: string) =>
    (value || 'uploads')
        .trim()
        .replace(/^[\\/]+/, '')
        .replace(/[\\/]+$/, '')
        .replace(/[\\\\]+/g, '/');

const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Failed to read image file.'));
        reader.readAsDataURL(file);
    });

export type ImageStorageUploadOptions = {
    folder?: string;
};

const readActorId = () => {
    if (typeof window === 'undefined') return '';
    try {
        const raw = localStorage.getItem('mahean_current_user');
        if (!raw) return '';
        const parsed = JSON.parse(raw) as { id?: string };
        return typeof parsed?.id === 'string' ? parsed.id : '';
    } catch {
        return '';
    }
};

export const uploadImageToStorage = async (file: File, options: ImageStorageUploadOptions = {}) => {
    const folder = normalizeFolder(options.folder);
    const dataUrl = await readFileAsDataUrl(file);
    const actorId = readActorId();

    const response = await fetch('/api/upload-image', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-actor-id': actorId
        },
        body: JSON.stringify({
            folder,
            dataUrl,
            actorId
        })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        const message = typeof payload?.error === 'string' ? payload.error : 'Image upload failed.';
        throw new Error(message);
    }

    return {
        bucket: 'local',
        path: payload.url,
        url: payload.url
    };
};
