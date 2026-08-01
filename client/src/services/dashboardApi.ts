import api from "@/services/axios";
import type { Analytics } from "@/types/Analytics";
import type { Collection } from "@/types/Collection";
import { DEFAULT_PAGINATION, type PaginationMeta } from "@/types/Pagination";
import type { Template } from "@/types/Template";

export const PAGE_SIZE = 10;

export interface TemplatesResponse {
	templates: Template[];
	pagination: PaginationMeta;
}

export interface CollectionsResponse {
	collections: Collection[];
	pagination: PaginationMeta;
}

export const fetchTemplates = async (
	baseUrl: string,
	params: {
		state?: "active" | "deleted";
		page?: number;
		pageSize?: number;
		collectionId?: number;
	},
): Promise<TemplatesResponse> => {
	const searchParams = new URLSearchParams({
		state: params.state ?? "active",
		page: String(params.page ?? 1),
		page_size: String(params.pageSize ?? PAGE_SIZE),
	});

	if (params.collectionId !== undefined) {
		searchParams.set("collection_id", String(params.collectionId));
	}

	const response = await api.get(
		`${baseUrl}/templates/?${searchParams.toString()}`,
	);

	return {
		templates: response.data.templates ?? [],
		pagination: response.data.pagination ?? DEFAULT_PAGINATION,
	};
};

export const fetchCollections = async (
	baseUrl: string,
	params: {
		page?: number;
		pageSize?: number;
		all?: boolean;
	},
): Promise<CollectionsResponse> => {
	const searchParams = new URLSearchParams({
		page: String(params.page ?? 1),
		page_size: String(params.pageSize ?? PAGE_SIZE),
	});

	if (params.all) {
		searchParams.set("all", "true");
	}

	const response = await api.get(
		`${baseUrl}/collections/?${searchParams.toString()}`,
	);

	return {
		collections: response.data.collections ?? [],
		pagination: response.data.pagination ?? DEFAULT_PAGINATION,
	};
};

export const fetchDashboardStats = async (
	baseUrl: string,
): Promise<{ total_generated: number }> => {
	const response = await api.get(`${baseUrl}/dashboard/stats/`);
	return { total_generated: response.data.total_generated ?? 0 };
};

export const fetchAnalytics = async (baseUrl: string): Promise<Analytics> => {
	const response = await api.get(`${baseUrl}/dashboard/analytics/`);
	return response.data;
};

// Fire-and-forget: a missed analytics event shouldn't ever block or fail
// the action (publishing, loading a template) that triggered it.
export const logActivity = (
	baseUrl: string,
	kind: "link_shared" | "template_loaded",
	label?: string,
): void => {
	void api
		.post(`${baseUrl}/activity/log/`, { kind, label })
		.catch(() => {});
};
