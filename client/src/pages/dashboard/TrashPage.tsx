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
import { Skeleton } from "@/components/ui/skeleton";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import useClearSelectionOnOutside from "@/hooks/useClearSelectionOnOutside";
import { cn } from "@/lib/utils";
import type { PaginationMeta } from "@/types/Pagination";
import { Template } from "@/types/Template";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, RotateCcw, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface Props {
	templates: Template[];
	isLoading: boolean;
	pagination: PaginationMeta;
	onPageChange: (page: number) => void;
	onRestore: (id: number) => void;
	onPermanentlyDelete: (id: number) => void;
}

const TILT = ["-rotate-2", "rotate-1", "-rotate-1", "rotate-2"];

const TrashPage = ({
	templates,
	isLoading,
	pagination,
	onPageChange,
	onRestore,
	onPermanentlyDelete,
}: Props) => {
	const navigate = useNavigate();
	const [restoreId, setRestoreId] = useState<number | null>(null);
	const [deleteId, setDeleteId] = useState<number | null>(null);
	const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(
		null,
	);
	const [visibleSkeletons, setVisibleSkeletons] = useState(1);
	const [layoutMode, setLayoutMode] = useState<"grid" | "list">("grid");
	const isListLayout = layoutMode === "list";
	const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);
	const templateToRestore = templates.find((t) => t.id === restoreId);
	const templateToDelete = templates.find((t) => t.id === deleteId);

	useClearSelectionOnOutside({
		enabled: selectedTemplateId !== null,
		selectors: ["[data-trash-card]", "[data-trash-dock]"],
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

	return (
		<div className="space-y-10">
			{/* Byline header */}
			<div className="relative">
				<span
					aria-hidden
					className="pointer-events-none absolute -left-2 -top-12 select-none font-playfair text-[7rem] font-bold italic leading-none text-foreground/[0.04] sm:text-[9rem]"
				>
					04
				</span>
				<div className="relative flex flex-col justify-between gap-5 border-b-2 border-foreground pb-4 sm:flex-row sm:items-end">
					<div>
						<button
							onClick={() => navigate("/dashboard/templates")}
							className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground transition-colors hover:text-foreground"
						>
							<ArrowLeft className="h-3.5 w-3.5" />
							Back to Templates
						</button>
						<h2 className="mt-3 font-playfair text-3xl italic text-foreground sm:text-4xl">
							The Archive
						</h2>
						<p className="mt-1 text-sm text-muted-foreground">
							{pagination.total_count} item
							{pagination.total_count !== 1 ? "s" : ""} · kept here
							until removed for good
						</p>
					</div>
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
								key={`trash-skeleton-${index}`}
								className="flex items-center gap-4 py-3"
							>
								<Skeleton className="h-12 w-16 shrink-0" />
								<Skeleton className="h-4 w-1/3" />
							</div>
						) : (
							<div
								key={`trash-skeleton-${index}`}
								className="w-40 shrink-0 border border-border bg-card p-2.5 pb-4 sm:w-48"
							>
								<Skeleton className="aspect-[4/3] w-full" />
								<Skeleton className="mt-3 h-4 w-2/3" />
							</div>
						),
					)}
				</div>
			) : templates.length === 0 ? (
				<div className="flex flex-col items-center gap-2 border-2 border-dashed border-border py-20 text-center">
					<p className="font-playfair text-2xl italic text-foreground">
						The archive is empty
					</p>
					<p className="font-hand text-xl text-secondary">
						deleted templates will turn up here
					</p>
				</div>
			) : isListLayout ? (
				<>
					<div className="divide-y divide-dashed divide-border border-t border-dashed border-border">
						{templates.map((t, i) => (
							<div
								key={t.id}
								data-trash-card
								onClick={() => setSelectedTemplateId(t.id)}
								onDoubleClick={() => setRestoreId(t.id)}
								className={cn(
									"group flex cursor-pointer items-center gap-4 py-3 opacity-70 grayscale transition-all hover:opacity-100 hover:grayscale-0",
									selectedTemplateId === t.id &&
										"bg-primary/5 opacity-100 grayscale-0",
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
								<div className="flex shrink-0 items-center gap-1">
									<Button
										variant="outline"
										size="sm"
										className="h-7 px-2"
										onClick={(e) => {
											e.stopPropagation();
											setRestoreId(t.id);
										}}
									>
										<RotateCcw className="mr-1 h-3 w-3" />
										Restore
									</Button>
									<Button
										variant="destructive"
										size="sm"
										className="h-7 px-2"
										onClick={(e) => {
											e.stopPropagation();
											setDeleteId(t.id);
										}}
									>
										<Trash2 className="mr-1 h-3 w-3" />
										Delete
									</Button>
								</div>
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
						{templates.map((t, i) => (
							<div
								key={t.id}
								data-trash-card
								onClick={() => setSelectedTemplateId(t.id)}
								onDoubleClick={() => setRestoreId(t.id)}
								className={cn(
									"group relative w-40 shrink-0 cursor-pointer border border-border bg-card p-2.5 pb-4 opacity-70 shadow-[3px_3px_0_hsl(var(--foreground)/0.1)] grayscale transition-all hover:z-10 hover:-translate-y-1 hover:rotate-0 hover:opacity-100 hover:grayscale-0 hover:shadow-[5px_5px_0_hsl(var(--foreground)/0.18)] sm:w-48",
									selectedTemplateId === t.id
										? "z-10 rotate-0 opacity-100 shadow-[5px_5px_0_hsl(var(--primary))] grayscale-0"
										: TILT[i % TILT.length],
								)}
							>
								<span className="pointer-events-none absolute right-2 top-2 z-10 -rotate-12 rounded-sm border border-destructive/50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-destructive/70">
									Archived
								</span>
								<div className="torn-edge aspect-[4/3] w-full overflow-hidden bg-muted">
									<img
										src={t.url}
										alt={t.name}
										className="h-full w-full object-cover"
									/>
								</div>
								<p className="font-hand mt-2 truncate text-center text-lg text-foreground">
									{t.name || "Untitled"}
								</p>
								<div className="mt-2 flex gap-1.5">
									<Button
										variant="outline"
										size="sm"
										className="h-7 flex-1 px-1 text-[11px]"
										onClick={(e) => {
											e.stopPropagation();
											setRestoreId(t.id);
										}}
									>
										<RotateCcw className="mr-1 h-3 w-3" />
										Restore
									</Button>
									<Button
										variant="destructive"
										size="sm"
										className="h-7 flex-1 px-1 text-[11px]"
										onClick={(e) => {
											e.stopPropagation();
											setDeleteId(t.id);
										}}
									>
										<Trash2 className="h-3 w-3" />
									</Button>
								</div>
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
						data-trash-dock
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
										onClick={() => setRestoreId(selectedTemplate.id)}
									>
										<RotateCcw className="h-4 w-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>Restore</TooltipContent>
							</Tooltip>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										size="icon"
										variant="destructive"
										onClick={() => setDeleteId(selectedTemplate.id)}
									>
										<Trash2 className="h-4 w-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>Delete Permanently</TooltipContent>
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

			{/* Permanent delete confirmation */}
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
							This will permanently delete "{templateToDelete?.name}"
							from the archive. This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => {
								if (deleteId) {
									onPermanentlyDelete(deleteId);
									setDeleteId(null);
								}
							}}
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<AlertDialog
				open={!!restoreId}
				onOpenChange={(o) => !o && setRestoreId(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle className="font-playfair text-xl italic">
							Restore Template?
						</AlertDialogTitle>
						<AlertDialogDescription>
							This will move "{templateToRestore?.name}" back to your
							templates list.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => {
								if (restoreId) {
									onRestore(restoreId);
									setRestoreId(null);
								}
							}}
						>
							Restore
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
};

export default TrashPage;
