import { ChevronLeft, ChevronRight } from 'lucide-react';
import './Pagination.css';

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
        const pages: Array<number | '...'> = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i += 1) {
                pages.push(i);
            }
            return pages;
        }

        if (currentPage <= 3) {
            for (let i = 1; i <= 4; i += 1) {
                pages.push(i);
            }
            pages.push('...');
            pages.push(totalPages);
            return pages;
        }

        if (currentPage >= totalPages - 2) {
            pages.push(1);
            pages.push('...');
            for (let i = totalPages - 3; i <= totalPages; i += 1) {
                pages.push(i);
            }
            return pages;
        }

        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i += 1) {
            pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);

        return pages;
    };

    const visiblePages = getVisiblePages();

    return (
        <div className="pagination-wrap">
            <div className="pagination-summary">
                দেখাচ্ছে {startItem} থেকে {endItem}, মোট {totalItems} টি {itemName}
            </div>

            <nav className="pagination-nav" aria-label="Pagination">
                <button
                    type="button"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="pagination-btn pagination-arrow"
                    aria-label="Previous page"
                >
                    <ChevronLeft className="pagination-icon" />
                </button>

                {visiblePages.map((page, index) => (
                    <div key={page === '...' ? `ellipsis-${index}` : `page-${page}`}>
                        {page === '...' ? (
                            <span className="pagination-ellipsis" aria-hidden="true">...</span>
                        ) : (
                            <button
                                type="button"
                                onClick={() => onPageChange(page)}
                                className={`pagination-btn ${currentPage === page ? 'is-active' : ''}`}
                                aria-current={currentPage === page ? 'page' : undefined}
                            >
                                {page}
                            </button>
                        )}
                    </div>
                ))}

                <button
                    type="button"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="pagination-btn pagination-arrow"
                    aria-label="Next page"
                >
                    <ChevronRight className="pagination-icon" />
                </button>
            </nav>
        </div>
    );
}
