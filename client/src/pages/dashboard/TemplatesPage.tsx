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
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
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
import useClearSelectionOnOutside from "@/hooks/useClearSelectionOnOutside";
import { useAuthContext } from "@/hooks/useAuthContext";
import type { Collection } from "@/hooks/useDashboardStore";
import { openTemplateInEditor } from "@/lib/editorUtils";
import { cn } from "@/lib/utils";
import type { PaginationMeta } from "@/types/Pagination";
import { Template } from "@/types/Template";
import { AnimatePresence, motion } from "framer-motion";
import {
	ArrowUpRightFromSquare,
	FolderPlus,
	Loader2,
	MoreVertical,
	Pencil,
	RefreshCw,
	Send,
	Sparkles,
	Trash2,
	X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

interface Props {
	templates: Template[];
	isLoading: boolean;
	pagination: PaginationMeta;
	onPageChange: (page: number) => void;
	collections: Collection[];
	onTrash: (id: number) => void;
	onUpdate: (id: number, updates: Partial<Template>) => void;
	onAssignCollection: (
		templateId: number,
		collectionId: number | null,
	) => Promise<void>;
	onUploadTemplate: (
		collectionId: number | null,
		file: File,
	) => Promise<void>;
}

type UploadingTemplate = {
	id: string;
	previewUrl: string;
	name: string;
};

const TILT = ["-rotate-2", "rotate-1", "-rotate-1", "rotate-2"];

const TemplatesPage = ({
	templates,
	isLoading,
	pagination,
	onPageChange,
	collections,
	onTrash,
	onUpdate,
	onAssignCollection,
	onUploadTemplate,
}: Props) => {
	const navigate = useNavigate();
	const { isPro } = useAuthContext();
	const [editTemplate, setEditTemplate] = useState<Template | null>(null);
	const [editName, setEditName] = useState("");
	const [deleteId, setDeleteId] = useState<number | null>(null);
	const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(
		null,
	);
	const [visibleSkeletons, setVisibleSkeletons] = useState(1);
	const [isUploadingTemplate, setIsUploadingTemplate] = useState(false);
	const [layoutMode, setLayoutMode] = useState<"grid" | "list">("grid");
	const [uploadingTemplates, setUploadingTemplates] = useState<
		UploadingTemplate[]
	>([]);
	const isListLayout = layoutMode === "list";

	const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

	useClearSelectionOnOutside({
		enabled: selectedTemplateId !== null,
		selectors: ["[data-template-card]", "[data-template-dock]"],
		onClear: () => setSelectedTemplateId(null),
	});

	useEffect(() => {
		if (!isLoading) return;

		setVisibleSkeletons(1);
		const timer = window.setInterval(() => {
			setVisibleSkeletons((prev) => Math.min(prev + 1, 8));
		}, 90);

		return () => {
			window.clearInterval(timer);
		};
	}, [isLoading]);

	useEffect(() => {
		if (
			selectedTemplateId !== null &&
			!templates.some((t) => t.id === selectedTemplateId)
		) {
			setSelectedTemplateId(null);
		}
	}, [selectedTemplateId, templates]);

	useEffect(() => {
		return () => {
			uploadingTemplates.forEach((upload) => {
				URL.revokeObjectURL(upload.previewUrl);
			});
		};
	}, [uploadingTemplates]);

	const openEdit = (t: Template) => {
		setEditTemplate(t);
		setEditName(t.name);
	};

	const saveEdit = () => {
		if (editTemplate && editName.trim()) {
			onUpdate(editTemplate.id, { name: editName.trim() });
			setEditTemplate(null);
		}
	};

	const handleUpdateTemplate = (t: Template) => {
		openTemplateInEditor(navigate, t);
	};

	const handleTemplateUpload = async (
		e: React.ChangeEvent<HTMLInputElement>,
	) => {
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

		setIsUploadingTemplate(true);
		try {
			await onUploadTemplate(null, file);
		} finally {
			setUploadingTemplates((prev) =>
				prev.filter((upload) => upload.id !== uploadId),
			);
			URL.revokeObjectURL(previewUrl);
			setIsUploadingTemplate(false);
		}
	};

	const totalCount = pagination.total_count + uploadingTemplates.length;

	const CardMenu = ({ t }: { t: Template }) => (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm transition-opacity"
					onClick={(e) => e.stopPropagation()}
				>
					<MoreVertical className="h-4 w-4" />
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem onClick={() => openEdit(t)}>
					<Pencil className="mr-2 h-4 w-4" /> Rename
				</DropdownMenuItem>
				<DropdownMenuItem onClick={() => handleUpdateTemplate(t)}>
					<RefreshCw className="mr-2 h-4 w-4" />
					Update Template
				</DropdownMenuItem>
				<DropdownMenuSub>
					<DropdownMenuSubTrigger>
						<FolderPlus className="mr-2 h-4 w-4" />
						Add to Collection
					</DropdownMenuSubTrigger>
					<DropdownMenuSubContent>
						<DropdownMenuItem
							onClick={() => onAssignCollection(t.id, null)}
						>
							None
						</DropdownMenuItem>
						{collections.map((c) => (
							<DropdownMenuItem
								key={c.id}
								onClick={() => onAssignCollection(t.id, c.id)}
							>
								{c.name}
							</DropdownMenuItem>
						))}
					</DropdownMenuSubContent>
				</DropdownMenuSub>
				<DropdownMenuItem
					className="text-destructive"
					onClick={() => setDeleteId(t.id)}
				>
					<Trash2 className="mr-2 h-4 w-4" /> Delete
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);

	return (
		<div className="space-y-10">
			<input
				type="file"
				id="templates-upload-input"
				className="hidden"
				accept="image/*"
				onChange={handleTemplateUpload}
			/>

			{/* Byline header */}
			<div className="relative">
				<span
					aria-hidden
					className="pointer-events-none absolute -left-2 -top-12 select-none font-playfair text-[7rem] font-bold italic leading-none text-foreground/[0.04] sm:text-[9rem]"
				>
					02
				</span>
				<div className="relative flex flex-col justify-between gap-5 border-b-2 border-foreground pb-4 sm:flex-row sm:items-end">
					<div>
						<h2 className="mt-1 font-playfair text-3xl italic text-foreground sm:text-4xl">
							My Templates
						</h2>
						<p className="mt-1 text-sm text-muted-foreground">
							{totalCount} template{totalCount !== 1 ? "s" : ""}{" "}
							on file · click to select, double-click to open
						</p>
						{!isPro && (
							<Link
								to="/pricing"
								className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-primary underline underline-offset-4"
							>
								<Sparkles className="h-3 w-3" />
								{totalCount}/2 free templates used ·
								Upgrade for unlimited
							</Link>
						)}
					</div>
					<div className="flex flex-wrap items-center gap-4">
						<button
							onClick={() => navigate("/dashboard/trash")}
							className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground transition-colors hover:text-foreground"
						>
							<Trash2 className="h-3.5 w-3.5" />
							Trash
						</button>
						<span className="hidden h-3 w-px bg-border sm:block" aria-hidden />
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
						<button
							onClick={() =>
								document
									.getElementById("templates-upload-input")
									?.click()
							}
							disabled={isUploadingTemplate}
							className="flex -rotate-2 items-center gap-2 border-2 border-foreground bg-secondary px-4 py-2 text-xs font-bold uppercase tracking-widest text-secondary-foreground shadow-[3px_3px_0_hsl(var(--foreground))] transition-all hover:rotate-0 disabled:opacity-60"
						>
							{isUploadingTemplate ? (
								<>
									<Loader2 className="h-3.5 w-3.5 animate-spin" />
									Uploading
								</>
							) : (
								<>+ Add Template</>
							)}
						</button>
					</div>
				</div>
			</div>

			{isLoading ? (
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
								key={`template-skeleton-${index}`}
								className="flex items-center gap-4 py-3"
							>
								<Skeleton className="h-12 w-16 shrink-0" />
								<Skeleton className="h-4 w-1/3" />
							</div>
						) : (
							<div
								key={`template-skeleton-${index}`}
								className="w-40 shrink-0 border border-border bg-card p-2.5 pb-4 sm:w-48"
							>
								<Skeleton className="aspect-[4/3] w-full" />
								<Skeleton className="mt-3 h-4 w-2/3" />
							</div>
						),
					)}
				</div>
			) : totalCount === 0 ? (
				<div className="flex flex-col items-center gap-2 border-2 border-dashed border-border py-20 text-center">
					<p className="font-playfair text-2xl italic text-foreground">
						Nothing on file yet
					</p>
					<p className="font-hand text-xl text-secondary">
						upload your first template ↓
					</p>
					<button
						onClick={() =>
							document
								.getElementById("templates-upload-input")
								?.click()
						}
						className="mt-2 border-2 border-foreground bg-primary px-4 py-2 text-xs font-bold uppercase tracking-widest text-primary-foreground shadow-[3px_3px_0_hsl(var(--foreground))] transition-all hover:-translate-y-0.5"
					>
						+ Add Template
					</button>
				</div>
			) : isListLayout ? (
				<>
					<div className="divide-y divide-dashed divide-border border-t border-dashed border-border">
						{uploadingTemplates.map((upload) => (
							<div
								key={upload.id}
								className="flex items-center gap-4 py-3 opacity-70"
							>
								<div className="relative h-12 w-16 shrink-0 overflow-hidden bg-muted">
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
						{templates.map((t, i) => (
							<div
								key={t.id}
								data-template-card
								onClick={() => setSelectedTemplateId(t.id)}
								onDoubleClick={() => handleUpdateTemplate(t)}
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
								{t.generation_count > 0 && (
									<span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
										<Send className="h-3 w-3" />
										{t.generation_count}
									</span>
								)}
								<CardMenu t={t} />
							</div>
						))}
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
						{templates.map((t, i) => (
							<div
								key={t.id}
								data-template-card
								onClick={() => setSelectedTemplateId(t.id)}
								onDoubleClick={() => handleUpdateTemplate(t)}
								className={cn(
									"group relative w-40 shrink-0 cursor-pointer border border-border bg-card p-2.5 pb-4 shadow-[3px_3px_0_hsl(var(--foreground)/0.12)] transition-all hover:z-10 hover:-translate-y-1 hover:rotate-0 hover:shadow-[5px_5px_0_hsl(var(--foreground)/0.2)] sm:w-48",
									selectedTemplateId === t.id
										? "z-10 rotate-0 shadow-[5px_5px_0_hsl(var(--primary))]"
										: TILT[i % TILT.length],
								)}
							>
								<div className="absolute right-3.5 top-3.5 z-10 opacity-0 transition-opacity group-hover:opacity-100">
									<CardMenu t={t} />
								</div>
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
								{t.generation_count > 0 && (
									<p className="mt-1 flex items-center justify-center gap-1 text-center text-[10px] text-muted-foreground">
										<Send className="h-3 w-3" />
										{t.generation_count} generated
									</p>
								)}
							</div>
						))}
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
				{selectedTemplate && (
					<motion.div
						className="fixed bottom-6 right-6 z-40"
						data-template-dock
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
										onClick={() => openEdit(selectedTemplate)}
									>
										<Pencil className="h-4 w-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>Rename</TooltipContent>
							</Tooltip>

							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										size="icon"
										variant="outline"
										onClick={() =>
											handleUpdateTemplate(selectedTemplate)
										}
									>
										<ArrowUpRightFromSquare className="h-4 w-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>Open in Editor</TooltipContent>
							</Tooltip>

							<DropdownMenu>
								<Tooltip>
									<TooltipTrigger asChild>
										<DropdownMenuTrigger asChild>
											<Button size="icon" variant="outline">
												<FolderPlus className="h-4 w-4" />
											</Button>
										</DropdownMenuTrigger>
									</TooltipTrigger>
									<TooltipContent>Add to Collection</TooltipContent>
								</Tooltip>
								<DropdownMenuContent align="start">
									<DropdownMenuItem
										onClick={() =>
											onAssignCollection(
												selectedTemplate.id,
												null,
											)
										}
									>
										None
									</DropdownMenuItem>
									{collections.map((c) => (
										<DropdownMenuItem
											key={c.id}
											onClick={() =>
												onAssignCollection(
													selectedTemplate.id,
													c.id,
												)
											}
										>
											{c.name}
										</DropdownMenuItem>
									))}
								</DropdownMenuContent>
							</DropdownMenu>

							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										size="icon"
										variant="destructive"
										onClick={() =>
											setDeleteId(selectedTemplate.id)
										}
									>
										<Trash2 className="h-4 w-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>Delete</TooltipContent>
							</Tooltip>

							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										size="icon"
										variant="ghost"
										onClick={() => setSelectedTemplateId(null)}
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

			<Dialog
				open={!!editTemplate}
				onOpenChange={(o) => !o && setEditTemplate(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle className="font-playfair text-xl italic">
							Rename Template
						</DialogTitle>
						<DialogDescription>
							Update the template name below.
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
						<Button variant="outline" onClick={() => setEditTemplate(null)}>
							Cancel
						</Button>
						<Button onClick={saveEdit}>Save</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<AlertDialog
				open={!!deleteId}
				onOpenChange={(o) => !o && setDeleteId(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle className="font-playfair text-xl italic">
							Delete Template?
						</AlertDialogTitle>
						<AlertDialogDescription>
							This template will be moved to Trash. You can restore
							it later.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => {
								if (deleteId) {
									onTrash(deleteId);
									setDeleteId(null);
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

export default TemplatesPage;
