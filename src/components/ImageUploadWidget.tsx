import { useState, useRef } from 'react';
import { Upload, X, Link as LinkIcon } from 'lucide-react';
import SmartImage from './SmartImage';

interface ImageUploadWidgetProps {
    label: string;
    icon?: React.ReactNode;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    isRound?: boolean;
}

const ImageUploadWidget = ({ label, icon, value, onChange, placeholder = "Image", isRound = false }: ImageUploadWidgetProps) => {
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
        <div className="form-group mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                {icon} {label}
            </label>
            <div className="flex items-start gap-4">
                <div
                    className={`relative shrink-0 ${isRound ? 'rounded-full' : 'rounded-lg'} border border-white/10 bg-white/5 group shadow-lg`}
                    style={{ width: '150px', height: '150px', minWidth: '150px', minHeight: '150px', flexShrink: 0, overflow: 'hidden', display: 'block' }}
                >
                    <SmartImage
                        src={value}
                        alt={label || placeholder}
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
                        className="hidden"
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

export default ImageUploadWidget;
