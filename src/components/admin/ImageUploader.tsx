import React, { useRef } from 'react';
import { Upload, X } from 'lucide-react';
import SmartImage from '../SmartImage';
import './ImageUploader.css';

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
                className={`image-uploader ${isRound ? 'image-uploader--round' : 'image-uploader--rect'} ${containerClass}`}
            >
                {value ? (
                    <>
                        <SmartImage
                            src={value}
                            alt="Preview"
                            className="image-uploader__image"
                            isRound={isRound}
                        />
                        <div className="image-uploader__overlay">
                            <Upload className="image-uploader__overlay-icon" size={32} />
                        </div>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onChange('');
                            }}
                            className="image-uploader__remove"
                        >
                            <X size={16} />
                        </button>
                    </>
                ) : (
                    <div className="image-uploader__placeholder">
                        <Upload size={48} className="image-uploader__placeholder-icon" />
                        <div className="image-uploader__placeholder-text">
                            <p className="image-uploader__placeholder-title">{placeholder}</p>
                            <p className="image-uploader__placeholder-subtitle">Recommended ratio: 16:9</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ImageUploader;
