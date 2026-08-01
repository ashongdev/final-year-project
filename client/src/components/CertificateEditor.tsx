import CertificatePreview from "@/components/CertificatePreview";
import ControlPanel from "@/components/ControlPanel";
import EditorAuthFooter from "@/components/EditorAuthFooter";
import Header from "@/components/Header";
import RecipientManager from "@/components/RecipientManager";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
	Dialog,
	DialogContent,
	DialogDescription,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { useAuthContext } from "@/hooks/useAuthContext";
import useFunctions from "@/hooks/useFunctions";
import useTemplateManager from "@/hooks/useTemplateManager";
import { useTour } from "@/hooks/useTour";
import { createDefaultTextField } from "@/lib/defaultField";
import { copyLinkToClipboard, restartTour } from "@/lib/editorUtils";
import { ADDABLE_FIELD_PRESETS } from "@/lib/fieldPresets";
import { cn } from "@/lib/utils";
import { logActivity } from "@/services/dashboardApi";
import type { Recipient, TextField } from "@/types/TextField";
import axios from "axios";
import type { DriveStep } from "driver.js";
import {
	AlertCircle,
	ChevronDown,
	Download,
	Eye,
	EyeOff,
	FlaskConical,
	Keyboard,
	Loader2,
	Plus,
	Search,
	Share2,
	Upload,
	Users,
	X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface CertificateEditorProps {
	mode: "simple" | "advanced";
	tourSteps: DriveStep[];
	tourStorageKey: string;
	initialFields?: TextField[];
	initialTemplateFile?: File | null;
	initialTemplateUrl?: string | null;
	initialRecipients?: Recipient[];
	templateUseMode?: "testing" | "actual";
}

const CertificateEditor = ({
	mode,
	tourSteps,
	tourStorageKey,
	initialFields,
	initialTemplateFile = null,
	initialTemplateUrl = null,
	initialRecipients = [],
	templateUseMode,
}: CertificateEditorProps) => {
	const navigate = useNavigate();
	const { BASE_URL } = useAuthContext();
	const { startTour, resetTour } = useTour({
		steps: tourSteps,
		storageKey: tourStorageKey,
		autoStart: true,
	});

	const [templateFile, setTemplateFile] = useState<File | null>(initialTemplateFile);
	const [templateUrl, setTemplateUrl] = useState<string | null>(initialTemplateUrl);
	const [showPreview] = useState(true);
	const [fields, setFields] = useState<TextField[]>(
		initialFields ?? [createDefaultTextField()],
	);
	const [selectedFieldId, setSelectedFieldId] = useState<string>(fields[0].id);
	const activeField = fields.find((f) => f.id === selectedFieldId) ?? fields[0];
	const [recipients, setRecipients] = useState<Recipient[]>(initialRecipients);
	const [showSharePanel, setShowSharePanel] = useState(false);
	const [isGenerating, setIsGenerating] = useState(false);
	const [showDragHint, setShowDragHint] = useState(false);
	const [isPreviewing, setIsPreviewing] = useState(false);
	const [showPreviewDialog, setShowPreviewDialog] = useState(false);
	const [showShortcutsDialog, setShowShortcutsDialog] = useState(false);
	const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(
		null,
	);

	const previewRef = useRef<HTMLDivElement>(null);
	const imgRef = useRef<HTMLImageElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const [generatedLink, setGeneratedLink] = useState("");
	const [customPublicId, setCustomPublicId] = useState("");
	const [isPublishing, setIsPublishing] = useState(false);

	const [showLoadDialog, setShowLoadDialog] = useState(false);
	const [loadId, setLoadId] = useState("");
	const [isLoadingById, setIsLoadingById] = useState(false);
	const [loadError, setLoadError] = useState<string | null>(null);
	const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string;

	const { addField, duplicateField, removeField, updateField } = useFunctions({
		fields,
		selectedFieldId,
		activeField,
		setFields,
		setSelectedFieldId,
	});

	const {
		handleDownload,
		handleFileSelect,
		handleShareClick,
		handlePublish,
		handleTemplateUpload,
		handleBatchDownload,
		handlePreview,
		handleSignatureUpload,
		setUploadedPublicId,
	} = useTemplateManager({
		templateFile,
		templateUrl,
		fields,
		recipients,
		customPublicId,
		isPublishing,
		setTemplateFile,
		setTemplateUrl,
		setCustomPublicId,
		setIsPublishing,
		setShowSharePanel,
		setGeneratedLink,
	});

	const isSimple = mode === "simple";
	const hasTemplate = !!templateUrl;

	const handleGenerateClick = async () => {
		if (isGenerating) return;
		setIsGenerating(true);
		try {
			await Promise.resolve(handleDownload());
		} finally {
			setIsGenerating(false);
		}
	};

	const handlePreviewClick = async () => {
		if (isPreviewing) return;
		setIsPreviewing(true);
		try {
			const url = await handlePreview();
			if (url) {
				setPreviewImageUrl((prev) => {
					if (prev) URL.revokeObjectURL(prev);
					return url;
				});
				setShowPreviewDialog(true);
			}
		} finally {
			setIsPreviewing(false);
		}
	};

	const handleDownloadFromPreview = () => {
		if (!previewImageUrl) return;
		const link = document.createElement("a");
		link.href = previewImageUrl;
		link.download = "Certificate.png";
		link.click();
		toast.success("Download complete");
	};

	const handlePreviewDialogChange = (open: boolean) => {
		setShowPreviewDialog(open);
		if (!open) {
			setPreviewImageUrl((prev) => {
				if (prev) URL.revokeObjectURL(prev);
				return null;
			});
		}
	};

	const handleLoadById = async () => {
		const id = loadId.trim();
		if (!id) {
			setLoadError("Please enter a certificate ID");
			return;
		}

		setIsLoadingById(true);
		setLoadError(null);

		const url = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${id}.png`;
		try {
			const res = await axios.head(url);
			if (res.status !== 200) throw new Error("Template not found");

			setTemplateUrl(url);
			setTemplateFile(null);
			setUploadedPublicId(id);
			setShowLoadDialog(false);
			setLoadId("");
			logActivity(BASE_URL, "template_loaded", id);
			toast.success("Template loaded successfully!");
		} catch {
			setLoadError("Template not found. Check the ID and try again.");
		} finally {
			setIsLoadingById(false);
		}
	};

	// When a template loads, snap any never-positioned (0,0) field to the
	// center of the image, then briefly hint that it can be dragged.
	useEffect(() => {
		if (!templateUrl) return;

		let cancelled = false;
		const img = new Image();
		img.onload = () => {
			if (cancelled) return;
			const centerX = Math.round(img.naturalWidth / 2);
			const centerY = Math.round(img.naturalHeight / 2);

			setFields((prev) =>
				prev.map((f) =>
					f.x === 0 && f.y === 0
						? { ...f, x: centerX, y: centerY }
						: f,
				),
			);

			setShowDragHint(true);
			window.setTimeout(() => setShowDragHint(false), 1800);
		};
		img.src = templateUrl;

		return () => {
			cancelled = true;
		};
	}, [templateUrl]);

	// Arrow-key nudging for the selected field, direct on the canvas.
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (
				showSharePanel ||
				showLoadDialog ||
				showPreviewDialog ||
				showShortcutsDialog
			)
				return;
			const tag = (document.activeElement?.tagName || "").toLowerCase();
			if (["input", "textarea", "select"].includes(tag)) return;
			if (!activeField) return;

			const step = e.shiftKey ? 10 : 1;
			const isDuplicateShortcut =
				(e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d";

			switch (true) {
				case e.key === "ArrowUp":
					e.preventDefault();
					updateField(activeField.id, { y: activeField.y - step });
					break;
				case e.key === "ArrowDown":
					e.preventDefault();
					updateField(activeField.id, { y: activeField.y + step });
					break;
				case e.key === "ArrowLeft":
					e.preventDefault();
					updateField(activeField.id, { x: activeField.x - step });
					break;
				case e.key === "ArrowRight":
					e.preventDefault();
					updateField(activeField.id, { x: activeField.x + step });
					break;
				case e.key === "Delete" || e.key === "Backspace":
					e.preventDefault();
					removeField(activeField.id);
					break;
				case isDuplicateShortcut:
					e.preventDefault();
					duplicateField(activeField.id);
					break;
				default:
					return;
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [
		activeField,
		showSharePanel,
		showLoadDialog,
		showPreviewDialog,
		showShortcutsDialog,
		updateField,
		removeField,
		duplicateField,
	]);

	return (
		<div className="h-screen bg-background flex flex-col overflow-hidden">
			<Header onTourClick={() => restartTour(resetTour, startTour)} />

			{isSimple && templateUseMode === "testing" && (
				<Alert className="rounded-none border-x-0 border-t-0 bg-muted/50">
					<FlaskConical className="h-4 w-4" />
					<AlertDescription>
						You&apos;re using a marketplace template in{" "}
						<strong>testing mode</strong> with sample data. Open Share
						to see sample recipient entries, or edit fields for your
						real certificate.
					</AlertDescription>
				</Alert>
			)}

			<input
				type="file"
				ref={fileInputRef}
				className="hidden"
				accept="image/*"
				onChange={handleFileSelect}
			/>

			{/* Toolbar — every whole-certificate action lives here, always visible */}
			<div
				className="border-b border-border flex-shrink-0 flex items-center gap-2 px-4 sm:px-6 h-14 overflow-x-auto"
				data-tour="tabs"
			>
				<Button
					variant="outline"
					size="sm"
					className="gap-2 shrink-0"
					onClick={() => fileInputRef.current?.click()}
				>
					<Upload className="h-4 w-4" />
					{hasTemplate ? "Change Template" : "Upload Template"}
				</Button>

				<Button
					variant="outline"
					size="sm"
					className="gap-2 shrink-0"
					onClick={() => {
						setLoadError(null);
						setShowLoadDialog(true);
					}}
				>
					<Search className="h-4 w-4" />
					Load by ID
				</Button>

				<div className="h-5 w-px bg-border shrink-0" aria-hidden />

				{isSimple ? (
					<Button
						variant="ghost"
						size="sm"
						className="shrink-0 text-muted-foreground hover:text-primary"
						onClick={() =>
							navigate("/advanced", {
								state: { fields, templateUrl, templateFile },
							})
						}
					>
						Switch to Advanced
					</Button>
				) : (
					<Button
						variant="ghost"
						size="sm"
						className="shrink-0 text-muted-foreground hover:text-primary"
						onClick={() =>
							navigate("/editor", {
								state: {
									fields: [fields[0]],
									templateUrl,
									templateFile,
								},
							})
						}
					>
						&larr; Simple Editor
					</Button>
				)}

				<div className="ml-auto flex items-center gap-2 shrink-0">
					<Button
						variant="ghost"
						size="icon"
						className="h-9 w-9 text-muted-foreground hover:text-foreground"
						onClick={() => setShowShortcutsDialog(true)}
						title="Keyboard shortcuts"
					>
						<Keyboard className="h-4 w-4" />
					</Button>

					<Button
						variant="outline"
						size="sm"
						className="gap-2"
						disabled={!hasTemplate || isPreviewing}
						onClick={handlePreviewClick}
					>
						{isPreviewing ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<Eye className="h-4 w-4" />
						)}
						Preview
					</Button>

					<Button
						size="sm"
						className="gap-2"
						disabled={!hasTemplate || isGenerating}
						onClick={handleGenerateClick}
					>
						{isGenerating ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<Download className="h-4 w-4" />
						)}
						Generate
					</Button>

					<Button
						variant="secondary"
						size="sm"
						className="gap-2"
						disabled={!hasTemplate}
						onClick={handleShareClick}
						data-tour="share-button"
					>
						<Share2 className="h-4 w-4" />
						Share
						{recipients.length > 0 && (
							<span className="ml-0.5 rounded-full bg-primary/15 px-1.5 text-xs font-medium text-primary">
								{recipients.length}
							</span>
						)}
					</Button>
				</div>
			</div>

			<main className="flex-1 min-h-0 overflow-hidden flex">
				<div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
					{!isSimple && (
						<div
							className="border-b border-border flex-shrink-0 flex items-center gap-2 px-4 sm:px-6 h-12 overflow-x-auto"
							data-tour="fields-list"
						>
							{fields.map((field, i) => (
								<button
									key={field.id}
									onClick={() => setSelectedFieldId(field.id)}
									className={cn(
										"group shrink-0 flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
										field.id === selectedFieldId
											? "border-primary bg-primary/10 text-primary"
											: "border-border text-muted-foreground hover:text-foreground hover:bg-muted",
										field.hidden && "opacity-50",
									)}
								>
									{field.label}
									{i > 0 && (
										<button
											type="button"
											onClick={(e) => {
												e.stopPropagation();
												updateField(field.id, { hidden: !field.hidden });
											}}
											className="text-muted-foreground hover:text-foreground"
											title={field.hidden ? "Show field" : "Hide field"}
										>
											{field.hidden ? (
												<EyeOff className="h-3 w-3" />
											) : (
												<Eye className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
											)}
										</button>
									)}
									{fields.length > 1 && (
										<X
											className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
											onClick={(e) => {
												e.stopPropagation();
												removeField(field.id);
											}}
										/>
									)}
								</button>
							))}
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<button
										data-tour="add-field-btn"
										className="shrink-0 flex items-center gap-1 rounded-full border border-dashed border-border px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
									>
										<Plus className="h-3 w-3" />
										Add Field
									</button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="start" className="w-56">
									{ADDABLE_FIELD_PRESETS.map((preset) => (
										<DropdownMenuItem
											key={preset.id}
											onClick={() => addField(preset.id)}
											className="gap-2"
										>
											<preset.icon className="h-3.5 w-3.5 text-muted-foreground" />
											<div className="flex flex-col">
												<span>{preset.label}</span>
												<span className="text-[10px] text-muted-foreground">
													{preset.description}
												</span>
											</div>
										</DropdownMenuItem>
									))}
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					)}

					<ScrollArea
						className="flex-1 min-h-0"
						data-tour="certificate-preview"
					>
						<div className="flex min-h-full items-start justify-center p-6">
							<CertificatePreview
								templateUrl={templateUrl}
								showPreview={showPreview}
								imgRef={imgRef}
								previewRef={previewRef}
								fields={fields}
								selectedFieldId={selectedFieldId}
								onFieldSelect={setSelectedFieldId}
								onFieldMove={(id, x, y) => updateField(id, { x, y })}
								onFieldResize={updateField}
								showDragHint={showDragHint}
							/>
						</div>
					</ScrollArea>

					{hasTemplate && (
						<p className="text-center text-xs text-muted-foreground pb-3 shrink-0">
							Drag the text to reposition · arrow keys to nudge
							(hold Shift for bigger steps)
						</p>
					)}
				</div>

				<div
					className="w-[300px] flex-shrink-0 min-h-0 border-l border-border overflow-hidden flex flex-col px-2 pt-4"
					data-tour="control-panel"
				>
					<ControlPanel
						fields={fields}
						selectedFieldId={selectedFieldId}
						onFieldUpdate={updateField}
						simpleView={isSimple}
						onUploadSignature={handleSignatureUpload}
					/>
				</div>
			</main>

			<Sheet open={showSharePanel} onOpenChange={setShowSharePanel}>
				<SheetContent
					side="right"
					className="w-full sm:max-w-md flex flex-col gap-0 p-0"
				>
					<SheetHeader className="p-6 pb-4 border-b border-border">
						<SheetTitle>Share Certificate</SheetTitle>
						<SheetDescription>
							Publish a link participants can use to generate their
							own certificate.
						</SheetDescription>
					</SheetHeader>
					<div className="flex-1 overflow-hidden">
						<div className="p-6 space-y-3 border-b border-border">
							{generatedLink ? (
								<>
									<Label htmlFor="link">Shareable Link</Label>
									<div className="flex items-center gap-2">
										<Input
											id="link"
											value={generatedLink}
											readOnly
										/>
										<Button
											size="sm"
											className="shrink-0 px-3"
											onClick={() =>
												void copyLinkToClipboard(
													generatedLink,
												)
											}
										>
											Copy
										</Button>
									</div>
									<Button
										variant="ghost"
										size="sm"
										className="text-muted-foreground"
										onClick={() => {
											setGeneratedLink("");
											setCustomPublicId("");
										}}
									>
										Publish a new link
									</Button>
								</>
							) : (
								<>
									<Label htmlFor="public-id">
										Public ID (optional)
									</Label>
									<Input
										id="public-id"
										value={customPublicId}
										onChange={(e) =>
											setCustomPublicId(e.target.value)
										}
										placeholder="e.g. hackathon-2024"
									/>
									<Button
										className="w-full"
										onClick={handlePublish}
										disabled={isPublishing}
									>
										{isPublishing
											? "Publishing..."
											: "Publish & Get Link"}
									</Button>
								</>
							)}
						</div>
						<Collapsible className="p-6">
							<CollapsibleTrigger className="group flex w-full items-center justify-between gap-2">
								<span className="flex items-center gap-2 text-sm font-medium">
									<Users className="h-4 w-4 text-muted-foreground" />
									Recipients
								</span>
								<ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
							</CollapsibleTrigger>
							<CollapsibleContent className="pt-4">
								<RecipientManager
									recipients={recipients}
									onRecipientsChange={setRecipients}
									onGenerateAll={handleBatchDownload}
								/>
							</CollapsibleContent>
						</Collapsible>
					</div>
				</SheetContent>
			</Sheet>

			<Dialog
				open={showLoadDialog}
				onOpenChange={(o) => {
					setShowLoadDialog(o);
					if (!o) setLoadError(null);
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Load Template by ID</DialogTitle>
						<DialogDescription>
							Enter the certificate ID of a previously published
							template to load it back into the editor.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-3 py-2">
						<Label htmlFor="load-id">Certificate ID</Label>
						<div className="flex gap-2">
							<Input
								id="load-id"
								value={loadId}
								onChange={(e) => {
									setLoadId(e.target.value);
									setLoadError(null);
								}}
								onKeyDown={(e) =>
									e.key === "Enter" && handleLoadById()
								}
								placeholder="e.g. hackathon-2024"
								className="font-mono"
								disabled={isLoadingById}
								autoFocus
							/>
							<Button
								onClick={handleLoadById}
								disabled={isLoadingById || !loadId.trim()}
								className="shrink-0"
							>
								{isLoadingById ? (
									<Loader2 className="h-4 w-4 animate-spin" />
								) : (
									<Search className="h-4 w-4" />
								)}
							</Button>
						</div>
						{loadError && (
							<div className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-3">
								<AlertCircle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
								<p className="text-sm text-destructive">
									{loadError}
								</p>
							</div>
						)}
					</div>
				</DialogContent>
			</Dialog>

			<Dialog open={showPreviewDialog} onOpenChange={handlePreviewDialogChange}>
				<DialogContent className="max-w-3xl">
					<DialogHeader>
						<DialogTitle>Preview</DialogTitle>
						<DialogDescription>
							This is exactly what a generated certificate will look
							like
						</DialogDescription>
					</DialogHeader>
					{previewImageUrl && (
						<div className="max-h-[70vh] overflow-auto rounded-md border border-border bg-muted">
							<img
								src={previewImageUrl}
								alt="Certificate preview"
								className="w-full h-auto"
							/>
						</div>
					)}
					<div className="flex justify-end gap-2">
						<Button
							variant="outline"
							onClick={() => handlePreviewDialogChange(false)}
						>
							Close
						</Button>
						<Button onClick={handleDownloadFromPreview} className="gap-2">
							<Download className="h-4 w-4" />
							Download
						</Button>
					</div>
				</DialogContent>
			</Dialog>

			<Dialog open={showShortcutsDialog} onOpenChange={setShowShortcutsDialog}>
				<DialogContent className="max-w-sm">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Keyboard className="h-4 w-4" />
							Keyboard &amp; Mouse
						</DialogTitle>
						<DialogDescription>
							Shortcuts for working with the selected field.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-1 text-sm">
						<div className="space-y-2">
							{[
								{ keys: ["↑", "↓", "←", "→"], label: "Move by 1px" },
								{ keys: ["Shift", "+ Arrow"], label: "Move by 10px" },
								{ keys: ["Delete"], label: "Remove field" },
								{ keys: ["Ctrl", "/", "⌘", "+ D"], label: "Duplicate field" },
							].map((shortcut, i) => (
								<div
									key={i}
									className="flex items-center justify-between gap-4"
								>
									<span className="text-muted-foreground">
										{shortcut.label}
									</span>
									<span className="flex shrink-0 items-center gap-1">
										{shortcut.keys.map((key, j) =>
											key === "/" || key.startsWith("+") ? (
												<span
													key={j}
													className="text-xs text-muted-foreground"
												>
													{key}
												</span>
											) : (
												<kbd
													key={j}
													className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs"
												>
													{key}
												</kbd>
											),
										)}
									</span>
								</div>
							))}
						</div>
						<div className="border-t border-border pt-3 text-xs text-muted-foreground">
							<p>Drag a field to reposition it.</p>
							<p>Drag a corner handle to resize it.</p>
							<p>Click the eye icon on a field chip to hide/show it.</p>
						</div>
					</div>
				</DialogContent>
			</Dialog>

			{isSimple && <EditorAuthFooter />}
		</div>
	);
};

export default CertificateEditor;
