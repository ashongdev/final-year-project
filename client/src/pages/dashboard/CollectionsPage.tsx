import ListPagination from "@/components/dashboard/ListPagination";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuthContext } from "@/hooks/useAuthContext";
import useClearSelectionOnOutside from "@/hooks/useClearSelectionOnOutside";
import type { Collection } from "@/hooks/useDashboardStore";
import { openTemplateInEditor } from "@/lib/editorUtils";
import { cn } from "@/lib/utils";
import { fetchTemplates, PAGE_SIZE } from "@/services/dashboardApi";
import type { PaginationMeta } from "@/types/Pagination";
import { clampPageAfterDelete, DEFAULT_PAGINATION } from "@/types/Pagination";
import { Template } from "@/types/Template";
import { AnimatePresence, motion } from "framer-motion";
import {
	ArrowUpRightFromSquare,
	FolderOpen,
	Loader2,
	MoreVertical,
	Pencil,
	Sparkles,
	Trash2,
	X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

interface Props {
	isLoading: boolean;
	collections: Collection[];
	pagination: PaginationMeta;
	onPageChange: (page: number) => void;
	onCreate: (name: string) => void;
	onUpdate: (id: number, name: string) => void;
	onDelete: (id: number) => void;
	onAssignCollection: (
		templateId: number,
		collectionId: number | null,
	) => Promise<void>;
	onUploadToCollection: (collectionId: number, file: File) => Promise<void>;
}

const TILT = ["-rotate-2", "rotate-1", "-rotate-1", "rotate-2"];

const CollectionsPage = ({
	isLoading,
	collections,
	pagination,
	onPageChange,
	onCreate,
	onUpdate,
	onDelete,
	onAssignCollection,
	onUploadToCollection,
}: Props) => {
	type UploadingTemplate = {
		id: string;
		previewUrl: string;
		name: string;
	};

	const navigate = useNavigate();
	const { BASE_URL, isPro } = useAuthContext();
	const [creating, setCreating] = useState(false);
	const [newName, setNewName] = useState("");
	const [visibleSkeletons, setVisibleSkeletons] = useState(1);
	const [editCol, setEditCol] = useState<Collection | null>(null);
	const [editName, setEditName] = useState("");
	const [deleteColId, setDeleteColId] = useState<number | null>(null);
	const [openedCollection, setOpenedCollection] = useState<Collection | null>(
		null,
	);
	const [selectedCollectionId, setSelectedCollectionId] = useState<
		number | null
	>(null);
	const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(
		null,
	);
	const [layoutMode, setLayoutMode] = useState<"grid" | "list">("grid");
	const [isUploadingToCollection, setIsUploadingToCollection] =
		useState(false);
	const [uploadingTemplates, setUploadingTemplates] = useState<
		UploadingTemplate[]
	>([]);
	const [detailTemplates, setDetailTemplates] = useState<Template[]>([]);
	const [detailPagination, setDetailPagination] =
		useState<PaginationMeta>(DEFAULT_PAGINATION);
	const [detailPage, setDetailPage] = useState(1);
	const [isDetailLoading, setIsDetailLoading] = useState(false);
	const isListLayout = layoutMode === "list";

	const handleCreate = () => {
		if (newName.trim()) {
			onCreate(newName.trim());
			setNewName("");
			setCreating(false);
		}
	};

	const saveEdit = () => {
		if (editCol && editName.trim()) {
			onUpdate(editCol.id, editName.trim());
			setEditCol(null);
		}
	};

	const selectedCollection = collections.find(
		(c) => c.id === selectedCollectionId,
	);
	const selectedTemplate = detailTemplates.find(
		(t) => t.id === selectedTemplateId,
	);

	const loadCollectionTemplates = useCallback(
		async (collectionId: number, page: number) => {
			setIsDetailLoading(true);
			try {
				const response = await fetchTemplates(BASE_URL, {
					state: "active",
					page,
					pageSize: PAGE_SIZE,
					collectionId,
				});
				setDetailTemplates(response.templates);
				setDetailPagination(response.pagination);
				setDetailPage(response.pagination.page);
			} finally {
				setIsDetailLoading(false);
			}
		},
		[BASE_URL],
	);

	useEffect(() => {
		if (!openedCollection) return;
		void loadCollectionTemplates(openedCollection.id, detailPage);
	}, [openedCollection, detailPage, loadCollectionTemplates]);

	useEffect(() => {
		if (openedCollection) {
			setDetailPage(1);
			setSelectedTemplateId(null);
		}
	}, [openedCollection?.id]);

	useClearSelectionOnOutside({
		enabled: openedCollection === null && selectedCollectionId !== null,
		selectors: ["[data-collection-card]", "[data-collection-dock]"],
		onClear: () => setSelectedCollectionId(null),
	});

	useClearSelectionOnOutside({
		enabled: openedCollection !== null && selectedTemplateId !== null,
		selectors: [
			"[data-collection-template-card]",
			"[data-collection-template-dock]",
		],
		onClear: () => setSelectedTemplateId(null),
	});

	const handleUploadToOpenedCollection = async (
		e: React.ChangeEvent<HTMLInputElement>,
	) => {
		if (!openedCollection) return;

		const file = e.target.files?.[0];
		e.currentTarget.value = "";
		if (!file) return;

		const uploadId = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
		const previewUrl = URL.createObjectURL(file);

		setUploadingTemplates((prev) => [
			...prev,
			{
				id: uploadId,
				previewUrl,
				name: file.name,
			},
		]);

		setIsUploadingToCollection(true);
		try {
			await onUploadToCollection(openedCollection.id, file);
			setDetailPage(1);
			await loadCollectionTemplates(openedCollection.id, 1);
		} finally {
			setUploadingTemplates((prev) =>
				prev.filter((upload) => upload.id !== uploadId),
			);
			URL.revokeObjectURL(previewUrl);
			setIsUploadingToCollection(false);
		}
	};

	useEffect(() => {
		return () => {
			uploadingTemplates.forEach((upload) => {
				URL.revokeObjectURL(upload.previewUrl);
			});
		};
	}, [uploadingTemplates]);

	useEffect(() => {
		if (
			selectedCollectionId !== null &&
			!collections.some((c) => c.id === selectedCollectionId)
		) {
			setSelectedCollectionId(null);
		}
	}, [collections, selectedCollectionId]);

	useEffect(() => {
		if (
			selectedTemplateId !== null &&
			!detailTemplates.some((t) => t.id === selectedTemplateId)
		) {
			setSelectedTemplateId(null);
		}
	}, [detailTemplates, selectedTemplateId]);

	useEffect(() => {
		if (!isLoading) return;

		setVisibleSkeletons(1);
		const timer = window.setInterval(() => {
			setVisibleSkeletons((prev) => Math.min(prev + 1, 6));
		}, 90);

		return () => {
			window.clearInterval(timer);
		};
	}, [isLoading]);

	const Byline = ({
		eyebrow,
		title,
		description,
		watermark,
		right,
	}: {
		eyebrow: string;
		title: string;
		description: string;
		watermark: string;
		right?: React.ReactNode;
	}) => (
		<div className="relative">
			<span
				aria-hidden
				className="pointer-events-none absolute -left-2 -top-12 select-none font-playfair text-[7rem] font-bold italic leading-none text-foreground/[0.04] sm:text-[9rem]"
			>
				{watermark}
			</span>
			<div className="relative flex flex-col justify-between gap-5 border-b-2 border-foreground pb-4 sm:flex-row sm:items-end">
				<div>
					<p className="text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
						{eyebrow}
					</p>
					<h2 className="mt-1 font-playfair text-3xl italic text-foreground sm:text-4xl">
						{title}
					</h2>
					<p className="mt-1 text-sm text-muted-foreground">
						{description}
					</p>
				</div>
				{right && <div className="flex items-center gap-4">{right}</div>}
			</div>
		</div>
	);

	const LayoutToggle = () => (
		<div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.15em]">
			<button
				onClick={() => setLayoutMode("grid")}
				className={cn(
					"border-b-2 pb-0.5 transition-colors",
					!isListLayout
						? "border-primary text-primary"
						: "border-transparent text-muted-foreground hover:text-foreground",
				)}
			>
				Grid
			</button>
			<span className="text-border">/</span>
			<button
				onClick={() => setLayoutMode("list")}
				className={cn(
					"border-b-2 pb-0.5 transition-colors",
					isListLayout
						? "border-primary text-primary"
						: "border-transparent text-muted-foreground hover:text-foreground",
				)}
			>
				List
			</button>
		</div>
	);

	if (isLoading) {
		return (
			<div className="space-y-10">
				<Byline
					eyebrow="Section 03"
					title="Collections"
					description="Loading your groupings…"
					watermark="03"
				/>
				<div
					className={
						isListLayout
							? "divide-y divide-dashed divide-border border-t border-dashed border-border"
							: "flex flex-wrap gap-x-4 gap-y-8"
					}
				>
					{Array.from({ length: visibleSkeletons }).map((_, index) =>
						isListLayout ? (
							<div
								key={`collection-skeleton-${index}`}
								className="flex items-center gap-4 py-3"
							>
								<Skeleton className="h-10 w-10 shrink-0 rounded-full" />
								<Skeleton className="h-4 w-1/3" />
							</div>
						) : (
							<div
								key={`collection-skeleton-${index}`}
								className="w-48 shrink-0 border border-border bg-card p-4"
							>
								<Skeleton className="h-5 w-2/3" />
								<Skeleton className="mt-3 h-3 w-1/2" />
							</div>
						),
					)}
				</div>
			</div>
		);
	}

	// Detail view — templates inside an opened collection
	if (openedCollection) {
		const colTemplates = detailTemplates;
		const hasDisplayTemplates =
			colTemplates.length > 0 || uploadingTemplates.length > 0;
		return (
			<div className="space-y-10">
				<input
					type="file"
					id="collection-upload-input"
					className="hidden"
					accept="image/*"
					onChange={handleUploadToOpenedCollection}
				/>

				<button
					onClick={() => setOpenedCollection(null)}
					className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
				>
					← Collections
				</button>

				<div className="relative flex flex-col justify-between gap-5 border-b-2 border-foreground pb-4 sm:flex-row sm:items-end">
					<div>
						<p className="text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
							Folder
						</p>
						<h2 className="mt-1 font-playfair text-3xl italic text-foreground sm:text-4xl">
							{openedCollection.name}
						</h2>
						<p className="mt-1 text-sm text-muted-foreground">
							{detailPagination.total_count} template
							{detailPagination.total_count !== 1 ? "s" : ""} · click
							to select, double-click to open
						</p>
					</div>
					<div className="flex items-center gap-4">
						<LayoutToggle />
						<button
							onClick={() =>
								document
									.getElementById("collection-upload-input")
									?.click()
							}
							disabled={isUploadingToCollection}
							className="flex -rotate-2 items-center gap-2 border-2 border-foreground bg-secondary px-4 py-2 text-xs font-bold uppercase tracking-widest text-secondary-foreground shadow-[3px_3px_0_hsl(var(--foreground))] transition-all hover:rotate-0 disabled:opacity-60"
						>
							{isUploadingToCollection ? (
								<>
									<Loader2 className="h-3.5 w-3.5 animate-spin" />
									Uploading
								</>
							) : (
								<>+ Upload Template</>
							)}
						</button>
					</div>
				</div>

				{isDetailLoading ? (
					<div className="flex min-h-[20vh] items-center justify-center">
						<Loader2 className="h-6 w-6 animate-spin text-primary" />
					</div>
				) : !hasDisplayTemplates ? (
					<div className="flex flex-col items-center gap-2 border-2 border-dashed border-border py-20 text-center">
						<p className="font-playfair text-2xl italic text-foreground">
							This folder is empty
						</p>
						<p className="font-hand text-xl text-secondary">
							upload one, or assign templates from Templates ↓
						</p>
					</div>
				) : isListLayout ? (
					<>
						<div className="divide-y divide-dashed divide-border border-t border-dashed border-border">
							{uploadingTemplates.map((upload) => (
								<div
									key={upload.id}
									className="flex items-center gap-4 py-3 opacity-70"
								>
									<div className="h-12 w-16 shrink-0 overflow-hidden bg-muted">
										<img
											src={upload.previewUrl}
											alt={upload.name}
											className="h-full w-full object-cover grayscale"
										/>
									</div>
									<div className="min-w-0 flex-1">
										<p className="truncate text-sm font-medium text-foreground">
											{upload.name}
										</p>
										<p className="flex items-center gap-1.5 text-xs text-muted-foreground">
											<Loader2 className="h-3 w-3 animate-spin" />
											Uploading...
										</p>
									</div>
								</div>
							))}
							{colTemplates.map((t, i) => (
								<div
									key={t.id}
									data-collection-template-card
									onClick={() => setSelectedTemplateId(t.id)}
									onDoubleClick={() =>
										openTemplateInEditor(navigate, t)
									}
									className={cn(
										"group flex cursor-pointer items-center gap-4 py-3 transition-colors",
										selectedTemplateId === t.id
											? "bg-primary/5"
											: "hover:bg-muted/40",
									)}
								>
									<span className="w-7 shrink-0 font-playfair text-sm italic text-muted-foreground">
										{String(i + 1).padStart(2, "0")}
									</span>
									<div className="h-12 w-16 shrink-0 overflow-hidden bg-muted">
										<img
											src={t.url}
											alt={t.name}
											className="h-full w-full object-cover"
										/>
									</div>
									<div className="min-w-0 flex-1">
										<p className="truncate text-sm font-medium text-foreground">
											{t.name}
										</p>
										<p className="truncate text-xs text-muted-foreground">
											{t.public_id}
										</p>
									</div>
									<Button
										variant="ghost"
										size="sm"
										className="h-7 shrink-0 px-2 text-xs text-muted-foreground hover:text-destructive"
										onClick={(event) => {
											event.stopPropagation();
											void (async () => {
												await onAssignCollection(t.id, null);
												const nextPage =
													clampPageAfterDelete(
														detailPagination,
													);
												if (nextPage !== detailPage) {
													setDetailPage(nextPage);
												} else {
													await loadCollectionTemplates(
														openedCollection.id,
														detailPage,
													);
												}
											})();
										}}
									>
										Remove
									</Button>
								</div>
							))}
						</div>
						<ListPagination
							pagination={detailPagination}
							onPageChange={setDetailPage}
							isLoading={isDetailLoading}
							className="pt-2"
						/>
					</>
				) : (
					<>
						<div className="flex flex-wrap items-start gap-x-4 gap-y-10">
							{uploadingTemplates.map((upload, i) => (
								<div
									key={upload.id}
									className={cn(
										"w-40 shrink-0 border border-border bg-card p-2.5 pb-4 opacity-70 sm:w-48",
										TILT[i % TILT.length],
									)}
								>
									<div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
										<img
											src={upload.previewUrl}
											alt={upload.name}
											className="h-full w-full object-cover grayscale"
										/>
										<div className="absolute inset-0 flex items-center justify-center bg-background/60">
											<Loader2 className="h-5 w-5 animate-spin text-foreground" />
										</div>
									</div>
									<p className="font-hand mt-2 truncate text-center text-lg text-foreground">
										{upload.name}
									</p>
								</div>
							))}
							{colTemplates.map((t, i) => (
								<div
									key={t.id}
									data-collection-template-card
									onClick={() => setSelectedTemplateId(t.id)}
									onDoubleClick={() =>
										openTemplateInEditor(navigate, t)
									}
									className={cn(
										"group relative w-40 shrink-0 cursor-pointer border border-border bg-card p-2.5 pb-4 shadow-[3px_3px_0_hsl(var(--foreground)/0.12)] transition-all hover:z-10 hover:-translate-y-1 hover:rotate-0 hover:shadow-[5px_5px_0_hsl(var(--foreground)/0.2)] sm:w-48",
										selectedTemplateId === t.id
											? "z-10 rotate-0 shadow-[5px_5px_0_hsl(var(--primary))]"
											: TILT[i % TILT.length],
									)}
								>
									<button
										className="absolute right-3.5 top-3.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-background/90 text-muted-foreground opacity-0 shadow-sm transition-opacity hover:text-destructive group-hover:opacity-100"
										onClick={(event) => {
											event.stopPropagation();
											void (async () => {
												await onAssignCollection(t.id, null);
												const nextPage =
													clampPageAfterDelete(
														detailPagination,
													);
												if (nextPage !== detailPage) {
													setDetailPage(nextPage);
												} else {
													await loadCollectionTemplates(
														openedCollection.id,
														detailPage,
													);
												}
											})();
										}}
									>
										<X className="h-3.5 w-3.5" />
									</button>
									<div className="aspect-[4/3] w-full overflow-hidden bg-muted">
										<img
											src={t.url}
											alt={t.name}
											className="h-full w-full object-cover"
										/>
									</div>
									<p className="font-hand mt-2 truncate text-center text-lg text-foreground">
										{t.name || "Untitled"}
									</p>
									<p className="truncate text-center text-[10px] uppercase tracking-wider text-muted-foreground">
										{t.public_id}
									</p>
								</div>
							))}
						</div>
						<ListPagination
							pagination={detailPagination}
							onPageChange={setDetailPage}
							isLoading={isDetailLoading}
							className="pt-2"
						/>
					</>
				)}

				<AnimatePresence>
					{selectedTemplate && (
						<motion.div
							className="fixed bottom-6 right-6 z-40"
							data-collection-template-dock
							initial={{ opacity: 0, y: 24, scale: 0.9 }}
							animate={{ opacity: 1, y: 0, scale: 1 }}
							exit={{ opacity: 0, y: 10, scale: 0.97 }}
							transition={{
								type: "spring",
								stiffness: 620,
								damping: 16,
								mass: 0.55,
							}}
						>
							<div className="flex items-center gap-2 rounded-full border-2 border-foreground bg-card p-2 shadow-[4px_4px_0_hsl(var(--foreground))]">
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											size="icon"
											variant="outline"
											onClick={() =>
												openTemplateInEditor(
													navigate,
													selectedTemplate,
												)
											}
										>
											<ArrowUpRightFromSquare className="h-4 w-4" />
										</Button>
									</TooltipTrigger>
									<TooltipContent>Open in Editor</TooltipContent>
								</Tooltip>
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											size="icon"
											variant="destructive"
											onClick={() =>
												void (async () => {
													await onAssignCollection(
														selectedTemplate.id,
														null,
													);
													const nextPage =
														clampPageAfterDelete(
															detailPagination,
														);
													if (nextPage !== detailPage) {
														setDetailPage(nextPage);
													} else {
														await loadCollectionTemplates(
															openedCollection.id,
															detailPage,
														);
													}
												})()
											}
										>
											<X className="h-4 w-4" />
										</Button>
									</TooltipTrigger>
									<TooltipContent>
										Remove from Collection
									</TooltipContent>
								</Tooltip>
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											size="icon"
											variant="ghost"
											onClick={() => setSelectedTemplateId(null)}
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									</TooltipTrigger>
									<TooltipContent>Clear Selection</TooltipContent>
								</Tooltip>
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		);
	}

	return (
		<div className="space-y-10">
			<Byline
				eyebrow="Section 03"
				title="Collections"
				description={
					collections.length > 0
						? "Double-click a folder to open it."
						: "Group templates together to keep events organized."
				}
				watermark="03"
				right={
					<>
						<LayoutToggle />
						{!creating ? (
							<button
								onClick={() => setCreating(true)}
								className="flex -rotate-2 items-center gap-2 border-2 border-foreground bg-secondary px-4 py-2 text-xs font-bold uppercase tracking-widest text-secondary-foreground shadow-[3px_3px_0_hsl(var(--foreground))] transition-all hover:rotate-0"
							>
								+ New Folder
							</button>
						) : (
							<div className="flex items-center gap-2">
								<Input
									autoFocus
									placeholder="Collection name..."
									value={newName}
									onChange={(e) => setNewName(e.target.value)}
									onKeyDown={(e) =>
										e.key === "Enter" && handleCreate()
									}
									className="h-9 w-48 rounded-none border-x-0 border-t-0 border-b-2 border-foreground bg-transparent px-0 focus-visible:ring-0"
								/>
								<Button size="sm" onClick={handleCreate}>
									Add
								</Button>
								<Button
									size="sm"
									variant="ghost"
									onClick={() => {
										setCreating(false);
										setNewName("");
									}}
								>
									<X className="h-4 w-4" />
								</Button>
							</div>
						)}
					</>
				}
			/>

			{!isPro && (
				<Link
					to="/pricing"
					className="-mt-6 inline-flex items-center gap-1.5 text-xs font-semibold text-primary underline underline-offset-4"
				>
					<Sparkles className="h-3 w-3" />
					{pagination.total_count}/2 free collections used ·
					Upgrade for unlimited
				</Link>
			)}

			{collections.length === 0 ? (
				<div className="flex flex-col items-center gap-2 border-2 border-dashed border-border py-20 text-center">
					<p className="font-playfair text-2xl italic text-foreground">
						No folders yet
					</p>
					<p className="font-hand text-xl text-secondary">
						create one to start organizing ↓
					</p>
					<button
						onClick={() => setCreating(true)}
						className="mt-2 border-2 border-foreground bg-primary px-4 py-2 text-xs font-bold uppercase tracking-widest text-primary-foreground shadow-[3px_3px_0_hsl(var(--foreground))] transition-all hover:-translate-y-0.5"
					>
						+ New Folder
					</button>
				</div>
			) : isListLayout ? (
				<>
					<div className="divide-y divide-dashed divide-border border-t border-dashed border-border">
						{collections.map((col, i) => {
							const templateCount = col.template_count ?? 0;
							return (
								<div
									key={col.id}
									data-collection-card
									onClick={() => setSelectedCollectionId(col.id)}
									onDoubleClick={() => setOpenedCollection(col)}
									className={cn(
										"group flex cursor-pointer items-center gap-4 py-3 transition-colors",
										selectedCollectionId === col.id
											? "bg-primary/5"
											: "hover:bg-muted/40",
									)}
								>
									<span className="w-7 shrink-0 font-playfair text-sm italic text-muted-foreground">
										{String(i + 1).padStart(2, "0")}
									</span>
									<FolderOpen className="h-4 w-4 shrink-0 text-secondary" />
									<div className="min-w-0 flex-1">
										<p className="truncate text-sm font-medium text-foreground">
											{col.name}
										</p>
										<p className="truncate text-xs text-muted-foreground">
											{templateCount} template
											{templateCount !== 1 ? "s" : ""}
										</p>
									</div>
									<DropdownMenu>
										<DropdownMenuTrigger
											asChild
											onClick={(e) => e.stopPropagation()}
										>
											<Button
												variant="ghost"
												size="icon"
												className="h-8 w-8 shrink-0"
											>
												<MoreVertical className="h-4 w-4" />
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent align="end">
											<DropdownMenuItem
												onClick={(e) => {
													e.stopPropagation();
													setEditCol(col);
													setEditName(col.name);
												}}
											>
												<Pencil className="mr-2 h-4 w-4" />
												Rename
											</DropdownMenuItem>
											<DropdownMenuItem
												className="text-destructive"
												onClick={(e) => {
													e.stopPropagation();
													setDeleteColId(col.id);
												}}
											>
												<Trash2 className="mr-2 h-4 w-4" />
												Delete Collection
											</DropdownMenuItem>
										</DropdownMenuContent>
									</DropdownMenu>
								</div>
							);
						})}
					</div>
					<ListPagination
						pagination={pagination}
						onPageChange={onPageChange}
						isLoading={isLoading}
						className="pt-2"
					/>
				</>
			) : (
				<>
					<div className="flex flex-wrap items-start gap-x-5 gap-y-10">
						{collections.map((col, i) => {
							const templateCount = col.template_count ?? 0;
							return (
								<div
									key={col.id}
									data-collection-card
									onClick={() => setSelectedCollectionId(col.id)}
									onDoubleClick={() => setOpenedCollection(col)}
									className={cn(
										"group relative w-48 shrink-0 cursor-pointer transition-all hover:z-10 hover:-translate-y-1 hover:rotate-0",
										selectedCollectionId === col.id
											? "z-10 rotate-0"
											: TILT[i % TILT.length],
									)}
								>
									{/* folder tab */}
									<div className="ml-3 h-4 w-16 border border-b-0 border-foreground bg-secondary" />
									<div
										className={cn(
											"border border-foreground bg-card p-4 shadow-[3px_3px_0_hsl(var(--foreground)/0.15)] transition-shadow group-hover:shadow-[5px_5px_0_hsl(var(--foreground)/0.22)]",
											selectedCollectionId === col.id &&
												"shadow-[5px_5px_0_hsl(var(--primary))]",
										)}
									>
										<div className="flex items-start justify-between gap-2">
											<FolderOpen className="h-5 w-5 shrink-0 text-secondary" />
											<DropdownMenu>
												<DropdownMenuTrigger
													asChild
													onClick={(e) =>
														e.stopPropagation()
													}
												>
													<button className="opacity-0 transition-opacity group-hover:opacity-100">
														<MoreVertical className="h-4 w-4 text-muted-foreground" />
													</button>
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end">
													<DropdownMenuItem
														onClick={(e) => {
															e.stopPropagation();
															setEditCol(col);
															setEditName(col.name);
														}}
													>
														<Pencil className="mr-2 h-4 w-4" />
														Rename
													</DropdownMenuItem>
													<DropdownMenuItem
														className="text-destructive"
														onClick={(e) => {
															e.stopPropagation();
															setDeleteColId(col.id);
														}}
													>
														<Trash2 className="mr-2 h-4 w-4" />
														Delete Collection
													</DropdownMenuItem>
												</DropdownMenuContent>
											</DropdownMenu>
										</div>
										<p className="font-hand mt-2 truncate text-2xl text-foreground">
											{col.name}
										</p>
										<p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
											{templateCount} template
											{templateCount !== 1 ? "s" : ""}
										</p>
									</div>
								</div>
							);
						})}
					</div>
					<ListPagination
						pagination={pagination}
						onPageChange={onPageChange}
						isLoading={isLoading}
						className="pt-2"
					/>
				</>
			)}

			<AnimatePresence>
				{selectedCollection && (
					<motion.div
						className="fixed bottom-6 right-6 z-40"
						data-collection-dock
						initial={{ opacity: 0, y: 24, scale: 0.9 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: 10, scale: 0.97 }}
						transition={{
							type: "spring",
							stiffness: 620,
							damping: 16,
							mass: 0.55,
						}}
					>
						<div className="flex items-center gap-2 rounded-full border-2 border-foreground bg-card p-2 shadow-[4px_4px_0_hsl(var(--foreground))]">
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										size="icon"
										variant="outline"
										onClick={() =>
											setOpenedCollection(selectedCollection)
										}
									>
										<ArrowUpRightFromSquare className="h-4 w-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>Open Collection</TooltipContent>
							</Tooltip>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										size="icon"
										variant="outline"
										onClick={() => {
											setEditCol(selectedCollection);
											setEditName(selectedCollection.name);
										}}
									>
										<Pencil className="h-4 w-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>Rename Collection</TooltipContent>
							</Tooltip>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										size="icon"
										variant="destructive"
										onClick={() =>
											setDeleteColId(selectedCollection.id)
										}
									>
										<Trash2 className="h-4 w-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>Delete Collection</TooltipContent>
							</Tooltip>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										size="icon"
										variant="ghost"
										onClick={() => setSelectedCollectionId(null)}
									>
										<X className="h-4 w-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>Clear Selection</TooltipContent>
							</Tooltip>
						</div>
					</motion.div>
				)}
			</AnimatePresence>

			<Dialog open={!!editCol} onOpenChange={(o) => !o && setEditCol(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle className="font-playfair text-xl italic">
							Rename Collection
						</DialogTitle>
						<DialogDescription>
							Enter a new name for this collection.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-3">
						<Label>Name</Label>
						<Input
							value={editName}
							onChange={(e) => setEditName(e.target.value)}
							onKeyDown={(e) => e.key === "Enter" && saveEdit()}
						/>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setEditCol(null)}>
							Cancel
						</Button>
						<Button onClick={saveEdit}>Save</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<AlertDialog
				open={!!deleteColId}
				onOpenChange={(o) => !o && setDeleteColId(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle className="font-playfair text-xl italic">
							Delete Collection?
						</AlertDialogTitle>
						<AlertDialogDescription>
							This will remove the collection grouping. Templates
							inside will not be deleted.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => {
								if (deleteColId) {
									onDelete(deleteColId);
									setDeleteColId(null);
								}
							}}
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
};

export default CollectionsPage;
