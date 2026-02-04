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

const ImageUploadWidget = ({ label, icon, value, onChange, placeholder = "Image URL", isRound = false }: ImageUploadWidgetProps) => {
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
            <label className="flex items-center gap-2 text-gray-300 mb-3 text-sm font-medium">
                {icon} {label}
            </label>

            <div className="flex items-start gap-4 p-4 bg-black/20 border border-white/5 rounded-xl">
                {/* Preview Box */}
                <div
                    className={`relative shrink-0 ${isRound ? 'rounded-full' : 'rounded-lg'} border border-white/10 bg-white/5 overflow-hidden group shadow-lg`}
                    style={{ width: '80px', height: '80px', minWidth: '80px', minHeight: '80px' }}
                >
                    <SmartImage
                        src={value}
                        alt={label}
                        className="w-full h-full object-cover"
                        isRound={isRound}
                    />

                    {value && (
                        <button
                            type="button"
                            onClick={() => onChange('')}
                            className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80"
                            title="Remove"
                        >
                            <X size={12} />
                        </button>
                    )}
                </div>

                {/* Controls */}
                <div className="flex-1 flex flex-col gap-3">
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex-1 border border-gray-600 text-gray-300 hover:border-amber-500 hover:text-amber-500 bg-transparent text-xs font-semibold uppercase tracking-wider py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-all duration-300"
                        >
                            <Upload size={14} /> Upload Pic
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowUrlInput(!showUrlInput)}
                            className={`border ${showUrlInput ? 'border-amber-500 text-amber-500' : 'border-gray-600 text-gray-400'} hover:border-amber-500 hover:text-amber-500 bg-transparent p-2.5 rounded-lg transition-all duration-300`}
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
                        <div className="animate-fade-in-up">
                            <input
                                type="text"
                                value={value || ''}
                                onChange={(e) => onChange(e.target.value)}
                                placeholder="https://example.com/image.jpg"
                                className="form-input bg-black/40 border border-white/10 rounded-lg p-2.5 w-full text-white text-sm focus:border-amber-500 focus:outline-none transition-colors"
                                autoFocus
                            />
                        </div>
                    )}

                    <div className="flex justify-between items-center px-1">
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-medium">
                            {value ? 'Image Selected' : 'No Image Selected'}
                        </p>
                        <span className="text-[10px] text-gray-600">MAX 2MB</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImageUploadWidget;
