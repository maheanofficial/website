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

    return (
        <div className="form-group mb-6">
            <label className="flex items-center gap-2 text-gray-300 mb-2 text-sm font-medium">
                {icon} {label}
            </label>

            {/* The Main Container */}
            <div className={`relative ${value ? 'p-3 bg-black/20 border border-white/5 rounded-xl' : ''}`}>

                {/* Preview State (If image selected) */}
                {value ? (
                    <div className="flex items-center gap-4">
                        <div className={`relative shrink-0 ${isRound ? 'rounded-full' : 'rounded-lg'} border border-white/10 bg-white/5 overflow-hidden w-16 h-16`}>
                            <img src={value} alt="Preview" className="w-full h-full object-cover" />
                            <button
                                type="button"
                                onClick={() => onChange('')}
                                className="absolute top-0 right-0 p-1 bg-black/50 text-white hover:bg-red-500 rounded-bl-lg transition-colors"
                            >
                                <X size={12} />
                            </button>
                        </div>
                        <div className="flex-1">
                            <p className="text-sm text-gray-300 font-medium truncate">Image Selected</p>
                            <button
                                onClick={() => onChange('')}
                                className="text-xs text-red-400 hover:text-red-300 mt-1"
                            >
                                Remove & Change
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Initial State (Buttons) - Matches Screenshot EXACTLY */
                    !showUrlInput ? (
                        <div className="flex items-stretch gap-3">
                            {/* Left Button: Transparent, Bordered, Rectangular */}
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="flex-[2] border border-gray-600 hover:border-gray-400 bg-transparent rounded-lg py-3 px-4 flex items-center justify-center gap-3 transition-colors h-[50px] group"
                            >
                                <Upload size={18} className="text-gray-400 group-hover:text-white" />
                                <span className="text-gray-400 font-bold text-sm tracking-widest uppercase group-hover:text-white">UPLOAD PIC</span>
                            </button>

                            {/* Right Button: White, Pill Shape */}
                            <button
                                type="button"
                                onClick={() => setShowUrlInput(true)}
                                className="flex-1 bg-gray-200 hover:bg-white text-black rounded-[30px] flex items-center justify-center transition-transform hover:scale-105 h-[50px]"
                                title="Enter URL"
                            >
                                <LinkIcon size={20} strokeWidth={2.5} />
                            </button>
                        </div>
                    ) : (
                        /* URL Input Mode */
                        <div className="flex items-center gap-2 animate-fade-in">
                            <input
                                type="text"
                                onChange={(e) => onChange(e.target.value)}
                                placeholder="Paste image link..."
                                className="flex-1 bg-transparent border border-amber-500 rounded-lg p-3 text-white focus:outline-none h-[50px]"
                                autoFocus
                            />
                            <button
                                type="button"
                                onClick={() => setShowUrlInput(false)}
                                className="bg-gray-800 text-gray-400 hover:text-white p-3 rounded-lg h-[50px] w-[50px] flex items-center justify-center"
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
            </div>
        </div>
    );
};

export default ImageUploadWidget;
