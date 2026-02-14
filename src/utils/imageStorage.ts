import { supabase } from '../lib/supabase';

const DEFAULT_BUCKET =
    (import.meta.env.VITE_SUPABASE_STORAGE_BUCKET as string | undefined) || 'mahean-media';

const normalizeFolder = (value?: string) =>
    (value || 'uploads')
        .trim()
        .replace(/^[\\/]+/, '')
        .replace(/[\\/]+$/, '')
        .replace(/[\\\\]+/g, '/');

const extensionFromMime = (mime: string) => {
    const normalized = mime.toLowerCase().trim();
    if (normalized === 'image/jpeg') return 'jpg';
    if (normalized === 'image/jpg') return 'jpg';
    if (normalized === 'image/png') return 'png';
    if (normalized === 'image/webp') return 'webp';
    if (normalized === 'image/gif') return 'gif';
    if (normalized === 'image/avif') return 'avif';
    if (normalized === 'image/svg+xml') return 'svg';
    return '';
};

const safeExtension = (file: File) => {
    const name = (file.name || '').trim();
    const dot = name.lastIndexOf('.');
    if (dot > -1 && dot < name.length - 1) {
        const ext = name.slice(dot + 1).toLowerCase();
        if (/^[a-z0-9]{1,8}$/.test(ext)) {
            return ext;
        }
    }
    return extensionFromMime(file.type) || 'jpg';
};

const makeId = () => {
    try {
        if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
            return crypto.randomUUID();
        }
    } catch {
        // Ignore crypto failures.
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export type ImageStorageUploadOptions = {
    bucket?: string;
    folder?: string;
};

export const uploadImageToStorage = async (file: File, options: ImageStorageUploadOptions = {}) => {
    const bucket = (options.bucket || DEFAULT_BUCKET).trim() || DEFAULT_BUCKET;
    const folder = normalizeFolder(options.folder);
    const ext = safeExtension(file);

    const now = new Date();
    const yyyy = String(now.getUTCFullYear());
    const mm = String(now.getUTCMonth() + 1).padStart(2, '0');

    const objectName = `${makeId()}.${ext}`;
    const path = `${folder}/${yyyy}/${mm}/${objectName}`;

    const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
        cacheControl: '31536000',
        contentType: file.type || undefined,
        upsert: false
    });

    if (error) {
        throw error;
    }

    const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(data.path);

    return {
        bucket,
        path: data.path,
        url: publicUrlData.publicUrl
    };
};

