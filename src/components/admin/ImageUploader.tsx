import React, { useRef, useState } from 'react';
import { Loader2, Upload, X } from 'lucide-react';
import SmartImage from '../SmartImage';
import { uploadImageToStorage } from '../../utils/imageStorage';
import './ImageUploader.css';

interface ImageUploaderProps {
    value?: string;
    onChange: (value: string) => void;
    placeholder?: string;
    helperText?: string;
    isRound?: boolean;
    containerClass?: string;
    variant?: 'classic' | 'circle';
    folder?: string;
}

const ImageUploader = ({
    value,
    onChange,
    placeholder = 'Click to upload an image',
    helperText,
    isRound = false,
    containerClass = '',
    variant = 'circle',
    folder
}: ImageUploaderProps) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [localPreview, setLocalPreview] = useState<string | null>(null);

    const readFileAsDataUrl = (file: File) =>
        new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error('Failed to read image file.'));
            reader.readAsDataURL(file);
        });

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            alert('File size exceeds 2MB limit.');
            return;
        }

        const previewUrl = URL.createObjectURL(file);
        setLocalPreview(previewUrl);
        setIsUploading(true);

        try {
            const uploaded = await uploadImageToStorage(file, { folder });
            onChange(uploaded.url);
        } catch (error) {
            console.warn('Supabase storage upload failed; falling back to base64.', error);
            try {
                const base64 = await readFileAsDataUrl(file);
                onChange(base64);
                alert(
                    "Storage upload failed, so we saved this image as base64 inside the database (old behavior).\n\nTo store images as CDN URLs, create a Supabase Storage bucket named 'mahean-media' and allow authenticated uploads + public read."
                );
            } catch (fallbackError) {
                console.warn('Base64 fallback failed', fallbackError);
                alert('Image upload failed. Please try again.');
            }
        } finally {
            setIsUploading(false);
            setLocalPreview(null);
            URL.revokeObjectURL(previewUrl);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const previewValue = localPreview || value;

    return (
        <div className="w-full">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                style={{ display: 'none' }}
            />

            <div
                onClick={() => {
                    if (isUploading) return;
                    fileInputRef.current?.click();
                }}
                className={`image-uploader ${isRound ? 'image-uploader--round' : 'image-uploader--rect'} ${isUploading ? 'image-uploader--uploading' : ''} ${containerClass}`}
                aria-busy={isUploading}
            >
                {previewValue ? (
                    <>
                        <SmartImage
                            src={previewValue}
                            alt="Preview"
                            className="image-uploader__image"
                            isRound={isRound}
                        />
                        <div className="image-uploader__overlay">
                            <Upload className="image-uploader__overlay-icon" size={32} />
                        </div>
                        {isUploading ? (
                            <div className="image-uploader__busy">
                                <Loader2 className="image-uploader__spinner" size={28} />
                                <span>Uploading...</span>
                            </div>
                        ) : null}
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setLocalPreview(null);
                                onChange('');
                            }}
                            className="image-uploader__remove"
                        >
                            <X size={16} />
                        </button>
                    </>
                ) : (
                    <div className={`image-uploader__placeholder ${variant === 'classic' ? 'image-uploader__placeholder--classic' : 'image-uploader__placeholder--circle'}`}>
                        {variant === 'classic' ? (
                            <>
                                <Upload size={48} className="image-uploader__placeholder-icon" />
                                <div className="image-uploader__placeholder-text">
                                    <p className="image-uploader__placeholder-title">{placeholder}</p>
                                    {helperText ? (
                                        <p className="image-uploader__placeholder-subtitle">{helperText}</p>
                                    ) : null}
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="image-uploader__placeholder-circle">
                                    <Upload size={22} className="image-uploader__placeholder-circle-icon" />
                                </div>
                                <div className="image-uploader__placeholder-text">
                                    <p className="image-uploader__placeholder-title">{placeholder}</p>
                                    {helperText ? (
                                        <p className="image-uploader__placeholder-subtitle">{helperText}</p>
                                    ) : null}
                                </div>
                            </>
                        )}
                        {isUploading ? (
                            <div className="image-uploader__busy">
                                <Loader2 className="image-uploader__spinner" size={28} />
                                <span>Uploading...</span>
                            </div>
                        ) : null}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ImageUploader;
