import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthContext } from "@/hooks/useAuthContext";
import { cn } from "@/lib/utils";
import { fetchSignatures } from "@/services/signaturesApi";
import type { Signature } from "@/types/Signature";
import { Eraser, Loader2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface SignaturePadProps {
	/** Called with the captured signature (drawn or uploaded), as a file the caller uploads. */
	onCapture: (file: File | Blob) => void;
	/** Called when an existing library signature is picked, no upload needed. */
	onSelectLibrary?: (signature: Signature) => void;
	/** Pen color for the draw tab, reuses the field's assigned text color. */
	penColor?: string;
	isUploading?: boolean;
	/** Hide the Library tab, e.g. when this pad is itself used to build the library. */
	showLibraryTab?: boolean;
}

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 180;

const SignaturePad = ({
	onCapture,
	onSelectLibrary,
	penColor = "#000000",
	isUploading = false,
	showLibraryTab = true,
}: SignaturePadProps) => {
	const { BASE_URL } = useAuthContext();
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const isDrawingRef = useRef(false);
	const lastPointRef = useRef<{ x: number; y: number } | null>(null);
	const [hasDrawn, setHasDrawn] = useState(false);
	const [library, setLibrary] = useState<Signature[]>([]);
	const [isLoadingLibrary, setIsLoadingLibrary] = useState(true);

	useEffect(() => {
		if (!showLibraryTab) {
			setIsLoadingLibrary(false);
			return;
		}
		let cancelled = false;
		fetchSignatures(BASE_URL)
			.then((signatures) => {
				if (!cancelled) setLibrary(signatures);
			})
			.finally(() => {
				if (!cancelled) setIsLoadingLibrary(false);
			});
		return () => {
			cancelled = true;
		};
	}, [BASE_URL, showLibraryTab]);

	const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
		const canvas = canvasRef.current;
		if (!canvas) return { x: 0, y: 0 };
		const rect = canvas.getBoundingClientRect();
		return {
			x: ((e.clientX - rect.left) / rect.width) * canvas.width,
			y: ((e.clientY - rect.top) / rect.height) * canvas.height,
		};
	};

	const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
		canvasRef.current?.setPointerCapture(e.pointerId);
		isDrawingRef.current = true;
		lastPointRef.current = getCanvasPoint(e);
	};

	const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
		if (!isDrawingRef.current) return;
		const canvas = canvasRef.current;
		const ctx = canvas?.getContext("2d");
		if (!canvas || !ctx || !lastPointRef.current) return;

		const point = getCanvasPoint(e);
		ctx.strokeStyle = penColor;
		ctx.lineWidth = 3;
		ctx.lineCap = "round";
		ctx.lineJoin = "round";
		ctx.beginPath();
		ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
		ctx.lineTo(point.x, point.y);
		ctx.stroke();
		lastPointRef.current = point;
		setHasDrawn(true);
	};

	const handlePointerUp = () => {
		isDrawingRef.current = false;
		lastPointRef.current = null;
	};

	const handleClear = () => {
		const canvas = canvasRef.current;
		const ctx = canvas?.getContext("2d");
		if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
		setHasDrawn(false);
	};

	const handleUseDrawing = () => {
		const canvas = canvasRef.current;
		if (!canvas || !hasDrawn) return;
		canvas.toBlob((blob) => {
			if (blob) onCapture(blob);
		}, "image/png");
	};

	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		e.currentTarget.value = "";
		if (file) onCapture(file);
	};

	return (
		<Tabs
			defaultValue={showLibraryTab && library.length > 0 ? "library" : "draw"}
			className="w-full"
		>
			<TabsList className={cn("grid w-full", showLibraryTab ? "grid-cols-3" : "grid-cols-2")}>
				{showLibraryTab && <TabsTrigger value="library">Library</TabsTrigger>}
				<TabsTrigger value="draw">Draw</TabsTrigger>
				<TabsTrigger value="upload">Upload</TabsTrigger>
			</TabsList>

			{showLibraryTab && (
				<TabsContent value="library">
					{isLoadingLibrary ? (
						<div className="flex h-[180px] w-full items-center justify-center text-muted-foreground">
							<Loader2 className="h-5 w-5 animate-spin" />
						</div>
					) : library.length === 0 ? (
						<div className="flex h-[180px] w-full flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border text-center text-sm text-muted-foreground">
							<p>No saved signatures yet</p>
							<p className="text-xs">
								Save one from the Signatures page in your dashboard
							</p>
						</div>
					) : (
						<div className="grid max-h-[180px] grid-cols-2 gap-2 overflow-y-auto">
							{library.map((signature) => (
								<button
									key={signature.id}
									type="button"
									onClick={() => onSelectLibrary?.(signature)}
									className="flex flex-col items-center gap-1 rounded-md border border-border p-2 transition-colors hover:border-primary"
								>
									<img
										src={signature.url}
										alt={signature.name}
										className="h-12 w-full object-contain"
									/>
									<span className="w-full truncate text-center text-xs text-muted-foreground">
										{signature.name}
									</span>
								</button>
							))}
						</div>
					)}
				</TabsContent>
			)}

			<TabsContent value="draw" className="space-y-2">
				<canvas
					ref={canvasRef}
					width={CANVAS_WIDTH}
					height={CANVAS_HEIGHT}
					onPointerDown={handlePointerDown}
					onPointerMove={handlePointerMove}
					onPointerUp={handlePointerUp}
					onPointerLeave={handlePointerUp}
					className="w-full touch-none rounded-md border border-dashed border-border bg-[repeating-linear-gradient(45deg,transparent,transparent_8px,hsl(var(--muted))_8px,hsl(var(--muted))_9px)] bg-background"
				/>
				<div className="flex gap-2">
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="flex-1"
						onClick={handleClear}
						disabled={!hasDrawn || isUploading}
					>
						<Eraser className="mr-1.5 h-3.5 w-3.5" />
						Clear
					</Button>
					<Button
						type="button"
						size="sm"
						className="flex-1"
						onClick={handleUseDrawing}
						disabled={!hasDrawn || isUploading}
					>
						{isUploading ? (
							<Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
						) : null}
						Use This Signature
					</Button>
				</div>
			</TabsContent>

			<TabsContent value="upload">
				<label
					className="flex h-[180px] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
				>
					{isUploading ? (
						<Loader2 className="h-5 w-5 animate-spin" />
					) : (
						<Upload className="h-5 w-5" />
					)}
					<span>Upload a signature image</span>
					<input
						type="file"
						accept="image/*"
						className="hidden"
						onChange={handleFileSelect}
						disabled={isUploading}
					/>
				</label>
			</TabsContent>
		</Tabs>
	);
};

export default SignaturePad;
