import { useDashboardStore } from "@/hooks/useDashboardStore";
import { Routes, Route, useLocation } from "react-router-dom";
import AccountSettingsTab from "./AccountSettingsTab";
import TemplatesPage from "./TemplatesPage";
import CollectionsPage from "./CollectionsPage";
import TrashPage from "./TrashPage";
import SettingsPage from "./SettingsPage";
import AnalyticsPage from "./AnalyticsPage";
import SignaturesPage from "./SignaturesPage";
import BillingPage from "./BillingPage";
import DashboardIndex from "./DashboardIndex";
import { useCallback, useEffect, useState } from "react";
import { Template } from "@/types/Template";
import { toast } from "sonner";
import { useAuthContext } from "@/hooks/useAuthContext";
import {
	fetchCollections,
	fetchTemplates,
	PAGE_SIZE,
} from "@/services/dashboardApi";
import {
	clampPageAfterDelete,
	DEFAULT_PAGINATION,
	type PaginationMeta,
} from "@/types/Pagination";

export interface Collection {
	id: number;
	name: string;
	created_at: string;
	template_count?: number;
}

const DashboardRoutes = () => {
	const [templates, setTemplates] = useState<Template[]>([]);
	const [collections, setCollections] = useState<Collection[]>([]);
	const [allCollections, setAllCollections] = useState<Collection[]>([]);

	const [templatesPagination, setTemplatesPagination] =
		useState<PaginationMeta>(DEFAULT_PAGINATION);
	const [collectionsPagination, setCollectionsPagination] =
		useState<PaginationMeta>(DEFAULT_PAGINATION);
	const [trashPagination, setTrashPagination] =
		useState<PaginationMeta>(DEFAULT_PAGINATION);

	const [templatesPage, setTemplatesPage] = useState(1);
	const [collectionsPage, setCollectionsPage] = useState(1);
	const [trashPage, setTrashPage] = useState(1);

	const [isActiveLoading, setIsActiveLoading] = useState(false);
	const [isDeletedLoading, setIsDeletedLoading] = useState(false);
	const [isCollectionsLoading, setIsCollectionsLoading] = useState(false);

	const store = useDashboardStore({
		templates,
		setTemplates,
		collections,
		setCollections,
	});
	const { BASE_URL } = useAuthContext();
	const location = useLocation();

	const loadActiveTemplates = useCallback(
		async (page: number) => {
			setIsActiveLoading(true);
			try {
				const response = await fetchTemplates(BASE_URL, {
					state: "active",
					page,
					pageSize: PAGE_SIZE,
				});
				setTemplates(response.templates);
				setTemplatesPagination(response.pagination);
				setTemplatesPage(response.pagination.page);
			} catch {
				toast.error("Error fetching templates.");
			} finally {
				setIsActiveLoading(false);
			}
		},
		[BASE_URL],
	);

	const loadTrashTemplates = useCallback(
		async (page: number) => {
			setIsDeletedLoading(true);
			try {
				const response = await fetchTemplates(BASE_URL, {
					state: "deleted",
					page,
					pageSize: PAGE_SIZE,
				});
				setTemplates(response.templates);
				setTrashPagination(response.pagination);
				setTrashPage(response.pagination.page);
			} catch {
				toast.error("Error fetching trash.");
			} finally {
				setIsDeletedLoading(false);
			}
		},
		[BASE_URL],
	);

	const loadCollections = useCallback(
		async (page: number) => {
			setIsCollectionsLoading(true);
			try {
				const response = await fetchCollections(BASE_URL, {
					page,
					pageSize: PAGE_SIZE,
				});
				setCollections(response.collections);
				setCollectionsPagination(response.pagination);
				setCollectionsPage(response.pagination.page);
			} catch {
				toast.error("Error fetching collections.");
			} finally {
				setIsCollectionsLoading(false);
			}
		},
		[BASE_URL],
	);

	const loadAllCollections = useCallback(async () => {
		try {
			const response = await fetchCollections(BASE_URL, { all: true });
			setAllCollections(response.collections);
		} catch {
			toast.error("Error fetching collections.");
		}
	}, [BASE_URL]);

	useEffect(() => {
		setTemplatesPage(1);
		setCollectionsPage(1);
		setTrashPage(1);
	}, [location.pathname]);

	useEffect(() => {
		if (location.pathname === "/dashboard/templates") {
			void loadActiveTemplates(templatesPage);
			void loadAllCollections();
		}
	}, [
		location.pathname,
		templatesPage,
		loadActiveTemplates,
		loadAllCollections,
	]);

	useEffect(() => {
		if (location.pathname === "/dashboard/collections") {
			void loadCollections(collectionsPage);
			void loadAllCollections();
		}
	}, [
		location.pathname,
		collectionsPage,
		loadCollections,
		loadAllCollections,
	]);

	useEffect(() => {
		if (location.pathname === "/dashboard/trash") {
			void loadTrashTemplates(trashPage);
		}
	}, [location.pathname, trashPage, loadTrashTemplates]);

	const handleTrashTemplate = useCallback(
		async (id: number) => {
			await store.trashTemplate(id);
			const nextPage = clampPageAfterDelete(templatesPagination);
			if (nextPage !== templatesPage) {
				setTemplatesPage(nextPage);
			} else {
				await loadActiveTemplates(templatesPage);
			}
		},
		[
			store,
			templatesPagination,
			templatesPage,
			loadActiveTemplates,
		],
	);

	const handleRestoreTemplate = useCallback(
		async (id: number) => {
			await store.restoreTemplate(id);
			const nextPage = clampPageAfterDelete(trashPagination);
			if (nextPage !== trashPage) {
				setTrashPage(nextPage);
			} else {
				await loadTrashTemplates(trashPage);
			}
		},
		[store, trashPagination, trashPage, loadTrashTemplates],
	);

	const handlePermanentDelete = useCallback(
		async (id: number) => {
			store.permanentlyDelete(id);
			const nextPage = clampPageAfterDelete(trashPagination);
			if (nextPage !== trashPage) {
				setTrashPage(nextPage);
			} else {
				await loadTrashTemplates(trashPage);
			}
		},
		[store, trashPagination, trashPage, loadTrashTemplates],
	);

	const handleUploadTemplate = useCallback(
		async (collectionId: number | null, file: File) => {
			const result = await store.uploadTemplateToCollection(
				collectionId,
				file,
			);
			if (result) {
				setTemplatesPage(1);
				await loadActiveTemplates(1);
				await loadAllCollections();
			}
		},
		[store, loadActiveTemplates, loadAllCollections],
	);

	const handleCreateCollection = useCallback(
		async (name: string) => {
			await store.createCollection(name);
			setCollectionsPage(1);
			await loadCollections(1);
			await loadAllCollections();
		},
		[store, loadCollections, loadAllCollections],
	);

	const handleDeleteCollection = useCallback(
		async (id: number) => {
			await store.deleteCollection(id);
			const nextPage = clampPageAfterDelete(collectionsPagination);
			if (nextPage !== collectionsPage) {
				setCollectionsPage(nextPage);
			} else {
				await loadCollections(collectionsPage);
			}
			await loadAllCollections();
		},
		[
			store,
			collectionsPagination,
			collectionsPage,
			loadCollections,
			loadAllCollections,
		],
	);

	const handleAssignCollection = useCallback(
		async (templateId: number, collectionId: number | null) => {
			await store.assignCollection(templateId, collectionId);
			await loadActiveTemplates(templatesPage);
			await loadAllCollections();
			if (location.pathname === "/dashboard/collections") {
				await loadCollections(collectionsPage);
			}
		},
		[
			store,
			templatesPage,
			collectionsPage,
			loadActiveTemplates,
			loadAllCollections,
			loadCollections,
			location.pathname,
		],
	);

	return (
		<Routes>
			<Route index element={<DashboardIndex />} />
			<Route
				path="templates"
				element={
					<TemplatesPage
						templates={templates}
						isLoading={isActiveLoading}
						pagination={templatesPagination}
						onPageChange={setTemplatesPage}
						collections={allCollections}
						onTrash={handleTrashTemplate}
						onUpdate={store.updateTemplate}
						onAssignCollection={handleAssignCollection}
						onUploadTemplate={handleUploadTemplate}
					/>
				}
			/>
			<Route
				path="collections"
				element={
					<CollectionsPage
						isLoading={isCollectionsLoading}
						collections={collections}
						pagination={collectionsPagination}
						onPageChange={setCollectionsPage}
						onCreate={handleCreateCollection}
						onUpdate={store.updateCollection}
						onDelete={handleDeleteCollection}
						onAssignCollection={handleAssignCollection}
						onUploadToCollection={handleUploadTemplate}
					/>
				}
			/>
			<Route
				path="trash"
				element={
					<TrashPage
						templates={templates}
						isLoading={isDeletedLoading}
						pagination={trashPagination}
						onPageChange={setTrashPage}
						onRestore={handleRestoreTemplate}
						onPermanentlyDelete={handlePermanentDelete}
					/>
				}
			/>
			<Route path="analytics" element={<AnalyticsPage />} />
			<Route path="signatures" element={<SignaturesPage />} />
			<Route path="settings" element={<SettingsPage />}>
				<Route index element={<AccountSettingsTab />} />
				<Route path="billing" element={<BillingPage />} />
			</Route>
		</Routes>
	);
};

export default DashboardRoutes;
