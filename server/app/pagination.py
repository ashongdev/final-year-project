DEFAULT_PAGE_SIZE = 10
MAX_PAGE_SIZE = 100


def get_pagination_params(request):
    try:
        page = int(request.query_params.get("page", 1))
    except (TypeError, ValueError):
        page = 1

    try:
        page_size = int(request.query_params.get("page_size", DEFAULT_PAGE_SIZE))
    except (TypeError, ValueError):
        page_size = DEFAULT_PAGE_SIZE

    page = max(1, page)
    page_size = min(MAX_PAGE_SIZE, max(1, page_size))
    return page, page_size


def paginate_queryset(queryset, page, page_size):
    total_count = queryset.count()
    total_pages = max(1, (total_count + page_size - 1) // page_size) if total_count else 1
    page = min(page, total_pages)
    offset = (page - 1) * page_size
    items = queryset[offset : offset + page_size]
    pagination = {
        "page": page,
        "page_size": page_size,
        "total_count": total_count,
        "total_pages": total_pages,
        "has_next": page < total_pages,
        "has_previous": page > 1,
    }
    return items, pagination
