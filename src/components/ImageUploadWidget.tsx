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
                    className={`relative shrink-0 ${isRound ? 'rounded-full' : 'rounded-lg'} border border-white/10 bg-white/5 overflow-hidden group shadow-lg`}
                    style={{ width: '64px', height: '64px', minWidth: '64px', minHeight: '64px' }}
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
                    {!showUrlInput ? (
                        <div className="flex gap-2 h-10">
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="flex-1 bg-transparent border border-white/20 hover:border-white/50 text-gray-300 hover:text-white rounded-lg text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                            >
                                <Upload size={14} /> Upload Pic
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowUrlInput(true)}
                                className="bg-gray-200 hover:bg-white text-black px-6 rounded-full flex items-center justify-center transition-all shadow-sm min-w-[60px]"
                                title="Enter URL"
                            >
                                <LinkIcon size={18} />
                            </button>
                        </div>
                    ) : (
                        <div className="flex gap-2 h-10 animate-fade-in">
                            <input
                                type="text"
                                value={value.startsWith('data:') ? '' : value}
                                onChange={(e) => onChange(e.target.value)}
                                placeholder="Paste image link..."
                                className="flex-1 bg-black/30 border border-amber-500 rounded-lg px-3 text-sm text-white focus:outline-none"
                                autoFocus
                            />
                            <button
                                type="button"
                                onClick={() => setShowUrlInput(false)}
                                className="px-3 bg-white/10 hover:bg-white/20 rounded-lg text-white"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    )}

                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        className="hidden"
                        style={{ display: 'none' }}
                    />

                    <p className="text-[10px] text-gray-500 uppercase tracking-widest pl-1">
                        {value ? 'Image Selected' : 'No image selected • Max 2MB'}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ImageUploadWidget;
