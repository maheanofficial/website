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

            <div className="bg-black/20 border border-white/10 rounded-lg overflow-hidden">
                {/* Mode Toggle Tabs */}
                <div className="flex border-b border-white/10">
                    <button
                        type="button"
                        onClick={() => setMode('file')}
                        className={`flex-1 py-2 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${mode === 'file'
                                ? 'bg-amber-500/20 text-amber-500'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <Upload size={14} /> Upload
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode('url')}
                        className={`flex-1 py-2 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${mode === 'url'
                                ? 'bg-amber-500/20 text-amber-500'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <LinkIcon size={14} /> Link
                    </button>
                </div>

                <div className="p-4">
                    {/* Preview Area */}
                    {value && (
                        <div className="mb-4 relative group">
                            <img
                                src={value}
                                alt="Preview"
                                className="w-full h-48 object-cover rounded-md border border-white/10"
                            />
                            <button
                                type="button"
                                onClick={() => onChange('')}
                                className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Remove Image"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    )}

                    {!value && mode === 'file' && (
                        <div
                            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${dragActive ? 'border-amber-500 bg-amber-500/10' : 'border-white/10 hover:border-amber-500/50 hover:bg-white/5'
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
                                className="hidden"
                                onChange={handleFileChange}
                            />
                            <Upload size={32} className="mx-auto text-gray-500 mb-2" />
                            <p className="text-gray-300 text-sm font-medium">Click to upload or drag & drop</p>
                            <p className="text-gray-500 text-xs mt-1">Max file size: 2MB</p>
                        </div>
                    )}

                    {!value && mode === 'url' && (
                        <input
                            type="url"
                            className="form-input bg-black/20 border border-white/10 rounded-lg p-3 w-full text-white focus:border-amber-500 focus:outline-none transition-colors"
                            placeholder={placeholder}
                            value={value}
                            onChange={(e) => onChange(e.target.value)}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default ImageUploadWidget;
