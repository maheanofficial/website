import React, { useState, useRef } from 'react';
import { Upload, X, Link as LinkIcon } from 'lucide-react';
import SmartImage from '../SmartImage';

interface ImageUploaderProps {
    value?: string;
    onChange: (value: string) => void;
    label?: string;
    placeholder?: string; // name/title for fallback
    isRound?: boolean;
}

const ImageUploader = ({ value, onChange, label = "Image", placeholder = "Image", isRound = false }: ImageUploaderProps) => {
    const [showUrlInput, setShowUrlInput] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                alert("File size exceeds 2MB limit.");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result as string;
                onChange(base64);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="form-group">
            <label className="block text-sm font-medium text-gray-400 mb-2">{label}</label>
            <div className="flex items-start gap-4">
                <div
                    className={`relative shrink-0 ${isRound ? 'rounded-full' : 'rounded-lg'} border border-white/10 bg-white/5 overflow-hidden group shadow-lg w-16 h-16 min-w-[64px] min-h-[64px] max-w-[64px] max-h-[64px]`}
                >
                    <SmartImage
                        src={value}
                        alt={placeholder || 'Preview'}
                        className="w-full h-full object-cover"
                        isRound={isRound}
                    />

                    {value && (
                        <button
                            type="button"
                            onClick={() => onChange('')}
                            className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80"
                        >
                            <X size={12} />
                        </button>
                    )}
                </div>

                <div className="flex-1 flex flex-col gap-2">
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex-1 btn btn-secondary text-sm flex items-center justify-center gap-2 py-2"
                        >
                            <Upload size={16} /> Upload Pic
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowUrlInput(!showUrlInput)}
                            className="btn btn-outline text-sm px-3"
                            title="Enter URL"
                        >
                            <LinkIcon size={16} />
                        </button>
                    </div>

                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        style={{ display: 'none' }}
                    />

                    {showUrlInput && (
                        <input
                            type="text"
                            value={value || ''}
                            onChange={(e) => onChange(e.target.value)}
                            placeholder="https://example.com/image.jpg"
                            className="form-input text-sm py-2"
                        />
                    )}

                    <p className="text-xs text-gray-500">
                        {value ? 'Image selected' : 'No image. Showing name initials.'}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ImageUploader;
