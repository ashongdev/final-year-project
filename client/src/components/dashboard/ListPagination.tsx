import type { PaginationMeta } from "@/types/Pagination";
import { cn } from "@/lib/utils";

interface ListPaginationProps {
	pagination: PaginationMeta;
	onPageChange: (page: number) => void;
	isLoading?: boolean;
	className?: string;
}

const ListPagination = ({
	pagination,
	onPageChange,
	isLoading = false,
	className,
}: ListPaginationProps) => {
	if (pagination.total_count === 0) {
		return null;
	}

	const startItem = (pagination.page - 1) * pagination.page_size + 1;
	const endItem = Math.min(
		pagination.page * pagination.page_size,
		pagination.total_count,
	);

	return (
		<div
			className={cn(
				"flex flex-col items-center justify-between gap-3 border-t border-dashed border-border pt-4 sm:flex-row",
				className,
			)}
		>
			<p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
				{startItem}–{endItem} of {pagination.total_count}
			</p>

			{pagination.total_pages > 1 && (
				<div className="flex items-center gap-5 text-xs font-semibold uppercase tracking-[0.15em]">
					<button
						disabled={!pagination.has_previous || isLoading}
						onClick={() => onPageChange(pagination.page - 1)}
						className="text-foreground transition-opacity hover:text-primary disabled:pointer-events-none disabled:opacity-30"
					>
						← Prev
					</button>
					<span className="font-playfair text-sm italic text-foreground">
						Page {pagination.page} / {pagination.total_pages}
					</span>
					<button
						disabled={!pagination.has_next || isLoading}
						onClick={() => onPageChange(pagination.page + 1)}
						className="text-foreground transition-opacity hover:text-primary disabled:pointer-events-none disabled:opacity-30"
					>
						Next →
					</button>
				</div>
			)}
		</div>
	);
};

export default ListPagination;
