import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Link as LinkIcon } from 'lucide-react';

interface ImageUploadWidgetProps {
    label: string;
    icon?: React.ReactNode;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

const ImageUploadWidget = ({ label, icon, value, onChange, placeholder = "Image URL or Upload" }: ImageUploadWidgetProps) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isHovering, setIsHovering] = useState(false);
    const [isUrlMode, setIsUrlMode] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
    };

    const processFile = (file: File) => {
        if (file.size > 2 * 1024 * 1024) {
            alert("File size exceeds 2MB limit.");
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => onChange(reader.result as string);
        reader.readAsDataURL(file);
    };

    return (
        <div className="form-group">
            <label className="flex items-center gap-2 text-gray-300 mb-2 text-sm font-medium">
                {icon} {label}
            </label>

            <div className="relative">
                {!value ? (
                    !isUrlMode ? (
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="flex-1 border border-white/20 hover:border-white/40 hover:bg-white/5 rounded-xl py-4 flex items-center justify-center gap-3 transition-all group"
                            >
                                <Upload size={18} className="text-gray-400 group-hover:text-white transition-colors" />
                                <span className="text-gray-400 font-bold tracking-widest text-xs uppercase group-hover:text-white transition-colors">UPLOAD PIC</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setIsUrlMode(true)}
                                className="bg-gray-200 hover:bg-white text-black h-[50px] w-[50px] rounded-2xl flex items-center justify-center transition-all transform hover:scale-105"
                                title="Paste Link"
                            >
                                <LinkIcon className="w-5 h-5" />
                            </button>
                        </div>
                    ) : (
                        <div className="relative animate-fade-in">
                            <input
                                type="text"
                                className="form-input bg-black/20 border border-white/10 rounded-lg p-3 pr-10 w-full text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none transition-colors"
                                placeholder={placeholder}
                                onChange={(e) => onChange(e.target.value)}
                                autoFocus
                            />
                            <button
                                type="button"
                                onClick={() => setIsUrlMode(false)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    )
                ) : (
                    <div
                        className="relative rounded-lg overflow-hidden border border-white/10 group h-48 bg-black/20 flex items-center justify-center"
                        onMouseEnter={() => setIsHovering(true)}
                        onMouseLeave={() => setIsHovering(false)}
                    >
                        <img src={value} alt="Preview" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />

                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                            <button
                                type="button"
                                onClick={() => onChange('')}
                                className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors transform scale-90 hover:scale-100"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>
                )}

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                />
            </div>
            {!value && !isUrlMode && (
                <div className="mt-2 flex justify-between px-1">
                    <span className="text-[10px] uppercase tracking-wider text-gray-600 font-medium">Max size: 2MB</span>
                </div>
            )}
        </div>
    );
};

export default ImageUploadWidget;
