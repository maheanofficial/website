import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

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
                    <div className="relative group">
                        <input
                            type="text"
                            className="form-input bg-black/20 border border-white/10 rounded-lg p-3 w-full text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none transition-colors"
                            placeholder={placeholder}
                            onChange={(e) => onChange(e.target.value)}
                        />
                    </div>
                ) : (
                    <div
                        className="relative rounded-lg overflow-hidden border border-white/10 group h-12 bg-black/20 flex items-center px-3"
                        onMouseEnter={() => setIsHovering(true)}
                        onMouseLeave={() => setIsHovering(false)}
                    >
                        <ImageIcon size={16} className="text-amber-500 mr-3" />
                        <span className="text-sm text-gray-300 truncate flex-1">{value.startsWith('data:') ? 'Uploaded Image' : value}</span>

                        {/* Preview Tooltip on Hover */}
                        {isHovering && (
                            <div className="absolute bottom-full left-0 mb-2 w-48 p-1 bg-black border border-white/10 rounded-lg shadow-xl z-10 animate-fade-in">
                                <img src={value} alt="Preview" className="w-full h-32 object-cover rounded" />
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={() => onChange('')}
                            className="p-1 hover:bg-white/10 rounded-full text-gray-400 hover:text-red-400 transition-colors ml-2"
                        >
                            <X size={16} />
                        </button>
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
            {!value && (
                <div className="flex justify-between items-center mt-5">
                    <span className="text-[10px] uppercase tracking-wider text-gray-500 font-medium ml-1">Max size: 2MB</span>
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500 hover:text-black px-4 py-2 rounded-md font-medium flex items-center gap-2 transition-all duration-300 shadow-sm"
                    >
                        <Upload size={14} /> Upload Image
                    </button>
                </div>
            )}
        </div>
    );
};

export default ImageUploadWidget;
