import React, { useRef } from 'react';
import { Upload, X } from 'lucide-react';
import SmartImage from '../SmartImage';

interface ImageUploaderProps {
    value?: string;
    onChange: (value: string) => void;
    placeholder?: string;
    isRound?: boolean;
    containerClass?: string;
}

const ImageUploader = ({ value, onChange, placeholder = "Image", isRound = false, containerClass = "" }: ImageUploaderProps) => {
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
        <div className="w-full">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                style={{ display: 'none' }}
            />

            <div
                onClick={() => fileInputRef.current?.click()}
                className={`${containerClass} overflow-hidden cursor-pointer relative group`}
            >
                {value ? (
                    <>
                        <SmartImage
                            src={value}
                            alt="Preview"
                            className="w-full h-full object-cover"
                            isRound={isRound}
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Upload className="text-white" size={32} />
                        </div>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onChange('');
                            }}
                            className="absolute top-4 right-4 p-2 bg-black/60 rounded-full text-white hover:bg-red-500/80 transition-colors"
                        >
                            <X size={16} />
                        </button>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center gap-4 text-gray-500">
                        <Upload size={48} className="opacity-40" />
                        <div className="text-center">
                            <p className="text-sm font-medium text-gray-400">{placeholder}</p>
                            <p className="text-xs text-gray-600 mt-1">Recommended ratio: 16:9</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ImageUploader;
