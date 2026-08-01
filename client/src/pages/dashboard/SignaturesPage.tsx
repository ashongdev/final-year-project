import SignaturePad from "@/components/SignaturePad";
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
import { useAuthContext } from "@/hooks/useAuthContext";
import {
	deleteSignature,
	fetchSignatures,
	renameSignature,
	saveSignature,
} from "@/services/signaturesApi";
import type { Signature } from "@/types/Signature";
import { MoreVertical, Pencil, PenLine, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const TILT = ["-rotate-2", "rotate-1", "-rotate-1", "rotate-2"];

const SignaturesPage = () => {
	const { BASE_URL } = useAuthContext();
	const [signatures, setSignatures] = useState<Signature[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	const [showAddDialog, setShowAddDialog] = useState(false);
	const [pendingCapture, setPendingCapture] = useState<File | Blob | null>(
		null,
	);
	const [newName, setNewName] = useState("");
	const [isSaving, setIsSaving] = useState(false);

	const [editTarget, setEditTarget] = useState<Signature | null>(null);
	const [editName, setEditName] = useState("");
	const [deleteId, setDeleteId] = useState<number | null>(null);

	const load = async () => {
		setIsLoading(true);
		try {
			const result = await fetchSignatures(BASE_URL);
			setSignatures(result);
		} catch {
			toast.error("Failed to load signatures");
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		void load();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [BASE_URL]);

	const handleCapture = (file: File | Blob) => {
		setPendingCapture(file);
	};

	const handleSaveNew = async () => {
		if (!pendingCapture) return;
		setIsSaving(true);
		try {
			const signature = await saveSignature(
				BASE_URL,
				pendingCapture,
				newName.trim() || "Signature",
			);
			setSignatures((prev) => [signature, ...prev]);
			toast.success("Signature saved");
			setShowAddDialog(false);
			setPendingCapture(null);
			setNewName("");
		} catch {
			toast.error("Failed to save signature");
		} finally {
			setIsSaving(false);
		}
	};

	const handleRename = async () => {
		if (!editTarget || !editName.trim()) return;
		try {
			await renameSignature(BASE_URL, editTarget.id, editName.trim());
			setSignatures((prev) =>
				prev.map((s) =>
					s.id === editTarget.id ? { ...s, name: editName.trim() } : s,
				),
			);
			setEditTarget(null);
		} catch {
			toast.error("Failed to rename signature");
		}
	};

	const handleDelete = async (id: number) => {
		try {
			await deleteSignature(BASE_URL, id);
			setSignatures((prev) => prev.filter((s) => s.id !== id));
			toast.success("Signature deleted");
		} catch {
			toast.error("Failed to delete signature");
		} finally {
			setDeleteId(null);
		}
	};

	return (
		<div className="space-y-10">
			{/* Byline header */}
			<div className="relative">
				<span
					aria-hidden
					className="pointer-events-none absolute -left-2 -top-12 select-none font-playfair text-[7rem] font-bold italic leading-none text-foreground/[0.04] sm:text-[9rem]"
				>
					03
				</span>
				<div className="relative flex flex-col justify-between gap-5 border-b-2 border-foreground pb-4 sm:flex-row sm:items-end">
					<div>
						<h2 className="mt-1 font-playfair text-3xl italic text-foreground sm:text-4xl">
							Signatures
						</h2>
						<p className="mt-1 text-sm text-muted-foreground">
							Save signatures here once, then pick them from any
							template's Signature field.
						</p>
					</div>
					<button
						onClick={() => setShowAddDialog(true)}
						className="flex -rotate-2 items-center gap-2 self-start border-2 border-foreground bg-secondary px-4 py-2 text-xs font-bold uppercase tracking-widest text-secondary-foreground shadow-[3px_3px_0_hsl(var(--foreground))] transition-all hover:rotate-0"
					>
						+ Add Signature
					</button>
				</div>
			</div>

			{isLoading ? (
				<div className="flex flex-wrap gap-x-4 gap-y-8">
					{Array.from({ length: 3 }).map((_, i) => (
						<div
							key={i}
							className="w-40 shrink-0 border border-border bg-card p-2.5 pb-4 sm:w-48"
						>
							<Skeleton className="aspect-[4/3] w-full" />
							<Skeleton className="mt-3 h-4 w-2/3" />
						</div>
					))}
				</div>
			) : signatures.length === 0 ? (
				<div className="flex flex-col items-center gap-2 border-2 border-dashed border-border py-20 text-center">
					<PenLine className="mb-2 h-8 w-8 text-muted-foreground" />
					<p className="font-playfair text-2xl italic text-foreground">
						No signatures saved yet
					</p>
					<p className="font-hand text-xl text-secondary">
						save one to reuse across templates ↓
					</p>
					<button
						onClick={() => setShowAddDialog(true)}
						className="mt-2 border-2 border-foreground bg-primary px-4 py-2 text-xs font-bold uppercase tracking-widest text-primary-foreground shadow-[3px_3px_0_hsl(var(--foreground))] transition-all hover:-translate-y-0.5"
					>
						+ Add Signature
					</button>
				</div>
			) : (
				<div className="flex flex-wrap items-start gap-x-4 gap-y-10">
					{signatures.map((signature, i) => (
						<div
							key={signature.id}
							className={`group relative w-40 shrink-0 border border-border bg-card p-2.5 pb-4 shadow-[3px_3px_0_hsl(var(--foreground)/0.12)] transition-all hover:z-10 hover:-translate-y-1 hover:rotate-0 hover:shadow-[5px_5px_0_hsl(var(--foreground)/0.2)] sm:w-48 ${TILT[i % TILT.length]}`}
						>
							<div className="absolute right-3.5 top-3.5 z-10 opacity-0 transition-opacity group-hover:opacity-100">
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<button className="flex h-7 w-7 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm">
											<MoreVertical className="h-4 w-4" />
										</button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end">
										<DropdownMenuItem
											onClick={() => {
												setEditTarget(signature);
												setEditName(signature.name);
											}}
										>
											<Pencil className="mr-2 h-4 w-4" /> Rename
										</DropdownMenuItem>
										<DropdownMenuItem
											className="text-destructive"
											onClick={() => setDeleteId(signature.id)}
										>
											<Trash2 className="mr-2 h-4 w-4" /> Delete
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</div>
							<div className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden bg-muted p-3">
								<img
									src={signature.url}
									alt={signature.name}
									className="h-full w-full object-contain"
								/>
							</div>
							<p className="font-hand mt-2 truncate text-center text-lg text-foreground">
								{signature.name}
							</p>
						</div>
					))}
				</div>
			)}

			{/* Add dialog */}
			<Dialog
				open={showAddDialog}
				onOpenChange={(open) => {
					setShowAddDialog(open);
					if (!open) {
						setPendingCapture(null);
						setNewName("");
					}
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle className="font-playfair text-xl italic">
							Add a Signature
						</DialogTitle>
						<DialogDescription>
							Draw or upload a signature to save to your library.
						</DialogDescription>
					</DialogHeader>
					<SignaturePad showLibraryTab={false} onCapture={handleCapture} />
					{pendingCapture && (
						<div className="space-y-2">
							<Label>Name</Label>
							<Input
								value={newName}
								onChange={(e) => setNewName(e.target.value)}
								placeholder="e.g. My Signature"
								autoFocus
							/>
						</div>
					)}
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setShowAddDialog(false)}
						>
							Cancel
						</Button>
						<Button
							onClick={handleSaveNew}
							disabled={!pendingCapture || isSaving}
						>
							{isSaving ? "Saving..." : "Save Signature"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Rename dialog */}
			<Dialog
				open={!!editTarget}
				onOpenChange={(open) => !open && setEditTarget(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle className="font-playfair text-xl italic">
							Rename Signature
						</DialogTitle>
					</DialogHeader>
					<div className="space-y-3">
						<Label>Name</Label>
						<Input
							value={editName}
							onChange={(e) => setEditName(e.target.value)}
							onKeyDown={(e) => e.key === "Enter" && handleRename()}
						/>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setEditTarget(null)}>
							Cancel
						</Button>
						<Button onClick={handleRename}>Save</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Delete confirmation */}
			<AlertDialog
				open={!!deleteId}
				onOpenChange={(open) => !open && setDeleteId(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle className="font-playfair text-xl italic">
							Delete Signature?
						</AlertDialogTitle>
						<AlertDialogDescription>
							This can't be undone. Any templates using this signature
							will keep the image they already have, but you won't be
							able to pick it from the library again.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => deleteId && handleDelete(deleteId)}
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
};

export default SignaturesPage;
