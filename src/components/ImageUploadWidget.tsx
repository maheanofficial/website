import { useState, useRef } from 'react';
import { Upload, X, Link as LinkIcon } from 'lucide-react';

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

    const handleUrlSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // Prevent form submission
            // Optionally close input here if needed
        }
    };

    return (
        <div className="form-group mb-6">
            <label className="flex items-center gap-2 text-gray-300 mb-2 text-sm font-medium">
                {icon} {label}
            </label>

            <div className="relative">
                {value ? (
                    // Preview State
                    <div className="flex items-center gap-4 p-3 bg-black/20 border border-white/5 rounded-xl animate-fade-in">
                        <div className={`relative shrink-0 ${isRound ? 'rounded-full' : 'rounded-lg'} border border-white/10 bg-white/5 overflow-hidden w-16 h-16`}>
                            <img src={value} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-300 font-medium truncate">Image Selected</p>
                            <button
                                type="button"
                                onClick={() => onChange('')}
                                className="text-xs text-red-400 hover:text-red-300 mt-1 flex items-center gap-1 transition-colors"
                            >
                                <X size={12} /> Remove
                            </button>
                        </div>
                    </div>
                ) : (
                    // Initial State - Matches Screenshot
                    !showUrlInput ? (
                        <div className="flex items-center gap-4">
                            {/* Left Button: Transparent, Bordered */}
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="flex-1 h-[54px] border border-white/20 hover:border-white/40 bg-transparent rounded-xl flex items-center justify-center gap-3 transition-all duration-300 group hover:bg-white/5"
                            >
                                <Upload size={18} className="text-gray-400 group-hover:text-white transition-colors" />
                                <span className="text-gray-400 font-bold text-xs tracking-[0.15em] uppercase group-hover:text-white transition-colors">
                                    Upload Pic
                                </span>
                            </button>

                            {/* Right Button: White Pill */}
                            <button
                                type="button"
                                onClick={() => setShowUrlInput(true)}
                                className="h-[54px] w-[90px] bg-[#E5E5E5] hover:bg-white text-black rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-105 shadow-lg"
                                title="Paste Link"
                            >
                                <LinkIcon size={22} strokeWidth={2} />
                            </button>
                        </div>
                    ) : (
                        // URL Input Mode
                        <div className="h-[54px] flex items-center gap-2 animate-fade-in">
                            <div className="flex-1 relative h-full">
                                <input
                                    type="url"
                                    onChange={(e) => onChange(e.target.value)}
                                    onKeyDown={handleUrlSubmit}
                                    placeholder="https://"
                                    className="w-full h-full bg-black/20 border border-amber-500/50 rounded-xl px-4 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 transition-colors"
                                    autoFocus
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowUrlInput(false)}
                                className="h-[54px] w-[54px] bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-gray-400 hover:text-white flex items-center justify-center transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    )
                )}

                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                    style={{ display: 'none' }}
                />

                {/* Helper Text */}
                {!value && !showUrlInput && (
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider text-right mt-2 pr-1">
                        Max 2MB
                    </p>
                )}
            </div>
        </div>
    );
};

export default ImageUploadWidget;
