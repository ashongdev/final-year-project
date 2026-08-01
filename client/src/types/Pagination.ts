export interface PaginationMeta {
	page: number;
	page_size: number;
	total_count: number;
	total_pages: number;
	has_next: boolean;
	has_previous: boolean;
}

export const DEFAULT_PAGINATION: PaginationMeta = {
	page: 1,
	page_size: 10,
	total_count: 0,
	total_pages: 1,
	has_next: false,
	has_previous: false,
};

export const clampPageAfterDelete = (
	pagination: PaginationMeta,
): number => {
	if (pagination.total_count <= 1) {
		return 1;
	}

	const remaining = pagination.total_count - 1;
	const totalPages = Math.max(
		1,
		Math.ceil(remaining / pagination.page_size),
	);
	return Math.min(pagination.page, totalPages);
};
