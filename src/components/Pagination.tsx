import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    totalItems: number;
    itemsPerPage: number;
    itemName: string;
}

export default function Pagination({
    currentPage,
    totalPages,
    onPageChange,
    totalItems,
    itemsPerPage,
    itemName
}: PaginationProps) {
    if (totalPages <= 1) return null;

    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    const getVisiblePages = () => {
        const pages = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            if (currentPage <= 3) {
                for (let i = 1; i <= 4; i++) {
                    pages.push(i);
                }
                pages.push('...');
                pages.push(totalPages);
            } else if (currentPage >= totalPages - 2) {
                pages.push(1);
                pages.push('...');
                for (let i = totalPages - 3; i <= totalPages; i++) {
                    pages.push(i);
                }
            } else {
                pages.push(1);
                pages.push('...');
                for (let i = currentPage - 1; i <= currentPage + 1; i++) {
                    pages.push(i);
                }
                pages.push('...');
                pages.push(totalPages);
            }
        }

        return pages;
    };

    const visiblePages = getVisiblePages();

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-12 bg-[#1e293b]/50 p-6 rounded-2xl border border-white/10">
            <div className="text-sm text-gray-400">
                দেখাচ্ছে {startItem} থেকে {endItem}, মোট {totalItems} টি {itemName}
            </div>

            <div className="flex items-center space-x-1">
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`p-2 rounded-lg border border-white/10 transition-all ${currentPage === 1
                            ? 'opacity-50 cursor-not-allowed'
                            : 'text-gray-300 hover:bg-white/10 hover:border-purple-500'
                        }`}
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>

                {visiblePages.map((page, index) => (
                    <div key={index}>
                        {page === '...' ? (
                            <span className="px-3 py-2 text-sm text-gray-500">...</span>
                        ) : (
                            <button
                                onClick={() => onPageChange(page as number)}
                                className={`px-3 py-2 text-sm rounded-lg border transition-all ${currentPage === page
                                        ? 'bg-purple-600 border-purple-600 text-white'
                                        : 'border-white/10 text-gray-300 hover:bg-white/10 hover:border-purple-500'
                                    }`}
                            >
                                {page}
                            </button>
                        )}
                    </div>
                ))}

                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`p-2 rounded-lg border border-white/10 transition-all ${currentPage === totalPages
                            ? 'opacity-50 cursor-not-allowed'
                            : 'text-gray-300 hover:bg-white/10 hover:border-purple-500'
                        }`}
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
