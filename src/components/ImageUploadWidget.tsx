import { useState, useRef } from 'react';
import { Upload, Link as LinkIcon, X, Image as ImageIcon } from 'lucide-react';

interface ImageUploadWidgetProps {
    label: string;
    icon?: React.ReactNode;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

const ImageUploadWidget = ({ label, icon, value, onChange, placeholder = "Image URL" }: ImageUploadWidgetProps) => {
    const [mode, setMode] = useState<'file' | 'url'>('file');
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        processFile(file);
    };

    const processFile = (file: File | undefined) => {
        if (!file) return;

        // 2MB Limit
        if (file.size > 2 * 1024 * 1024) {
            alert("File size exceeds 2MB limit.");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            onChange(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processFile(e.dataTransfer.files[0]);
        }
    };

    return (
        <div className="form-group">
            <label className="flex items-center gap-2 text-gray-300 mb-2 text-sm font-medium">
                {icon} {label}
            </label>

            <div className="bg-black/20 border border-white/10 rounded-xl overflow-hidden">
                {/* Mode Toggle Tabs */}
                <div className="flex bg-black/40 border-b border-white/5">
                    <button
                        type="button"
                        onClick={() => setMode('file')}
                        className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-all ${mode === 'file'
                                ? 'bg-amber-500/10 text-amber-500 shadow-[inset_0_-2px_0_0_rgba(245,158,11,1)]'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <Upload size={16} /> Upload
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode('url')}
                        className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-all ${mode === 'url'
                                ? 'bg-amber-500/10 text-amber-500 shadow-[inset_0_-2px_0_0_rgba(245,158,11,1)]'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <LinkIcon size={16} /> Link
                    </button>
                </div>

                <div className="p-5">
                    {/* Preview Area */}
                    {value && (
                        <div className="relative group rounded-lg overflow-hidden border border-white/10 bg-black/50">
                            <img
                                src={value}
                                alt="Preview"
                                className="w-full h-48 object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                            />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <button
                                    type="button"
                                    onClick={() => onChange('')}
                                    className="bg-red-500/90 text-white px-4 py-2 rounded-full flex items-center gap-2 hover:bg-red-600 transition-colors transform translate-y-2 group-hover:translate-y-0 duration-300"
                                >
                                    <X size={16} /> Remove
                                </button>
                            </div>
                        </div>
                    )}

                    {!value && mode === 'file' && (
                        <div
                            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${dragActive
                                    ? 'border-amber-500 bg-amber-500/10 scale-[1.02]'
                                    : 'border-white/10 hover:border-amber-500/40 hover:bg-white/5'
                                }`}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={handleFileChange}
                            />
                            <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mb-1">
                                <Upload size={24} className="text-amber-500" />
                            </div>
                            <div>
                                <p className="text-gray-200 font-medium mb-1">Click to upload or drag & drop</p>
                                <p className="text-gray-500 text-xs">Maximum file size: 2MB</p>
                            </div>
                        </div>
                    )}

                    {!value && mode === 'url' && (
                        <div className="animate-fade-in">
                            <input
                                type="url"
                                className="form-input bg-black/20 border border-white/10 rounded-lg p-3 w-full text-white focus:border-amber-500 focus:outline-none transition-colors"
                                placeholder={placeholder}
                                value={value}
                                onChange={(e) => onChange(e.target.value)}
                                autoFocus
                            />
                            <p className="text-gray-500 text-xs mt-2 ml-1">Paste the direct link to the image here.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ImageUploadWidget;
