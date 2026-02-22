import { buildServerAuthHeaders } from './serverAuth';

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

type UploadImagePayload = {
    folder: string;
    dataUrl: string;
};

export const uploadImageToStorage = async (file: File, options: ImageStorageUploadOptions = {}) => {
    const folder = normalizeFolder(options.folder);
    const dataUrl = await readFileAsDataUrl(file);

    return uploadDataUrlToStorage(dataUrl, { folder });
};

const uploadDataUrlPayload = async ({ folder, dataUrl }: UploadImagePayload) => {
    const response = await fetch('/api/upload-image', {
        method: 'POST',
        credentials: 'same-origin',
        headers: buildServerAuthHeaders({
            'Content-Type': 'application/json'
        }),
        body: JSON.stringify({
            folder,
            dataUrl
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

type UploadDataUrlOptions = ImageStorageUploadOptions;

export const uploadDataUrlToStorage = async (dataUrl: string, options: UploadDataUrlOptions = {}) => {
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
        throw new Error('Invalid image data format.');
    }
    const folder = normalizeFolder(options.folder);
    return uploadDataUrlPayload({ folder, dataUrl });
};
