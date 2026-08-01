import { cn } from "@/lib/utils";
import { TextField } from "@/types/TextField";
import { motion } from "framer-motion";
import { RefObject, useEffect, useRef, useState } from "react";

interface CertificatePreviewProps {
	templateUrl: string | null;
	fields: TextField[];
	selectedFieldId: string;
	onFieldSelect: (id: string) => void;
	showPreview: boolean;
	previewRef: RefObject<HTMLDivElement>;
	imgRef: RefObject<HTMLImageElement>;
	isParticipant?: boolean;
	/** When provided (and not isParticipant), fields can be dragged directly on the canvas. */
	onFieldMove?: (id: string, x: number, y: number) => void;
	/**
	 * When provided (and not isParticipant), the selected field shows corner
	 * handles for drag-to-resize. Deliberately a separate prop from
	 * onFieldMove: resizing is organizer-only even where dragging isn't.
	 */
	onFieldResize?: (id: string, updates: Partial<TextField>) => void;
	/** Briefly pulses the selected field to hint that it can be dragged. */
	showDragHint?: boolean;
}

type ResizeCorner = "tl" | "tr" | "bl" | "br";

interface ResizeState {
	fieldId: string;
	// Screen-space position of the corner opposite the one being dragged;
	// this stays fixed for the duration of the resize.
	anchorX: number;
	anchorY: number;
	startDiagonal: number;
	// Natural (unscaled) units: field.width/fontSize and field.height.
	startWidth: number;
	startHeight: number;
	isImage: boolean;
}

const MIN_FONT_SIZE = 8;
const MAX_FONT_SIZE = 300;
const MIN_IMAGE_DIMENSION = 20;
const MAX_IMAGE_DIMENSION = 1000;

const CertificatePreview = ({
	templateUrl,
	fields,
	selectedFieldId,
	onFieldSelect,
	showPreview,
	previewRef,
	imgRef,
	isParticipant = false,
	onFieldMove,
	onFieldResize,
	showDragHint = false,
}: CertificatePreviewProps) => {
	const [imageScale, setImageScale] = useState({
		scale: 1,
		offsetX: 0,
		offsetY: 0,
	});
	const draggingId = useRef<string | null>(null);
	const resizeState = useRef<ResizeState | null>(null);
	const isDraggable = !isParticipant && !!onFieldMove;
	const isResizable = !isParticipant && !!onFieldResize;

	// Calculate actual image dimensions and scale
	useEffect(() => {
		const calculateImageScale = () => {
			if (!imgRef.current || !previewRef.current) return;

			const img = imgRef.current;
			const container = previewRef.current;

			const naturalWidth = img.naturalWidth;
			const naturalHeight = img.naturalHeight;
			const containerWidth = container.clientWidth;
			const containerHeight = container.clientHeight;

			if (!naturalWidth || !naturalHeight) return;

			// Calculate how the image is scaled by object-contain
			const scaleX = containerWidth / naturalWidth;
			const scaleY = containerHeight / naturalHeight;
			const scale = Math.min(scaleX, scaleY);

			// Calculate the rendered image dimensions
			const renderedWidth = naturalWidth * scale;
			const renderedHeight = naturalHeight * scale;

			// Calculate offset caused by centering
			const offsetX = (containerWidth - renderedWidth) / 2;
			const offsetY = (containerHeight - renderedHeight) / 2;

			setImageScale({ scale, offsetX, offsetY });
		};

		if (imgRef.current) {
			const img = imgRef.current;

			if (img.complete && img.naturalWidth) {
				calculateImageScale();
			} else {
				img.onload = calculateImageScale;
			}
		}

		window.addEventListener("resize", calculateImageScale);
		return () => window.removeEventListener("resize", calculateImageScale);
	}, [templateUrl, imgRef, previewRef]);

	const movePointerToField = (fieldId: string, clientX: number, clientY: number) => {
		if (!onFieldMove || !previewRef.current || !imgRef.current) return;

		const rect = previewRef.current.getBoundingClientRect();
		const naturalX = (clientX - rect.left - imageScale.offsetX) / imageScale.scale;
		const naturalY = (clientY - rect.top - imageScale.offsetY) / imageScale.scale;

		const maxX = imgRef.current.naturalWidth || naturalX;
		const maxY = imgRef.current.naturalHeight || naturalY;

		onFieldMove(
			fieldId,
			Math.round(Math.min(Math.max(naturalX, 0), maxX)),
			Math.round(Math.min(Math.max(naturalY, 0), maxY)),
		);
	};

	const handlePointerDown = (
		e: React.PointerEvent<HTMLSpanElement>,
		fieldId: string,
	) => {
		if (!isDraggable) return;
		e.preventDefault();
		e.stopPropagation();
		onFieldSelect(fieldId);
		draggingId.current = fieldId;
		e.currentTarget.setPointerCapture(e.pointerId);
	};

	const handlePointerMove = (e: React.PointerEvent<HTMLSpanElement>, fieldId: string) => {
		if (draggingId.current !== fieldId) return;
		movePointerToField(fieldId, e.clientX, e.clientY);
	};

	const handlePointerUp = (e: React.PointerEvent<HTMLSpanElement>) => {
		if (!draggingId.current) return;
		draggingId.current = null;
		e.currentTarget.releasePointerCapture(e.pointerId);
	};

	const handleResizePointerDown = (
		e: React.PointerEvent<HTMLSpanElement>,
		field: TextField,
		corner: ResizeCorner,
	) => {
		if (!isResizable) return;
		e.preventDefault();
		e.stopPropagation();

		const fieldEl = e.currentTarget.parentElement;
		const rect = fieldEl?.getBoundingClientRect();
		if (!rect) return;

		resizeState.current = {
			fieldId: field.id,
			anchorX: corner.includes("l") ? rect.right : rect.left,
			anchorY: corner.includes("t") ? rect.bottom : rect.top,
			startDiagonal: Math.hypot(rect.width, rect.height) || 1,
			startWidth: field.imageUrl ? (field.width ?? 200) : field.fontSize,
			startHeight: field.height ?? 100,
			isImage: !!field.imageUrl,
		};
		e.currentTarget.setPointerCapture(e.pointerId);
	};

	const handleResizePointerMove = (e: React.PointerEvent<HTMLSpanElement>) => {
		const state = resizeState.current;
		if (!state || !onFieldResize) return;

		const dx = Math.abs(e.clientX - state.anchorX);
		const dy = Math.abs(e.clientY - state.anchorY);
		const ratio = (Math.hypot(dx, dy) || 1) / state.startDiagonal;

		if (state.isImage) {
			onFieldResize(state.fieldId, {
				width: Math.round(
					Math.min(
						MAX_IMAGE_DIMENSION,
						Math.max(MIN_IMAGE_DIMENSION, state.startWidth * ratio),
					),
				),
				height: Math.round(
					Math.min(
						MAX_IMAGE_DIMENSION,
						Math.max(MIN_IMAGE_DIMENSION, state.startHeight * ratio),
					),
				),
			});
		} else {
			onFieldResize(state.fieldId, {
				fontSize: Math.round(
					Math.min(
						MAX_FONT_SIZE,
						Math.max(MIN_FONT_SIZE, state.startWidth * ratio),
					),
				),
			});
		}
	};

	const handleResizePointerUp = (e: React.PointerEvent<HTMLSpanElement>) => {
		resizeState.current = null;
		e.currentTarget.releasePointerCapture(e.pointerId);
	};

	return (
		<motion.div
			initial={{ opacity: 0, scale: 0.95 }}
			animate={{ opacity: 1, scale: 1 }}
			transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
			className="relative w-full min-h-full flex items-center justify-center"
		>
			{templateUrl ? (
				<div
					ref={previewRef}
					className="relative max-w-5xl w-full aspect-[1.414/1] shadow-medium rounded-xs overflow-hidden bg-muted"
				>
					<img
						ref={imgRef}
						src={templateUrl}
						alt="Certificate Template"
						className="w-full h-full object-contain"
						draggable={false}
					/>

					{showPreview &&
						fields &&
						fields?.length &&
						fields?.filter((field) => !field.hidden).map((field) => {
							const isSelected =
								!isParticipant && field.id === selectedFieldId;
							const pulseDragHint =
								isDraggable && isSelected && showDragHint;
							const isImageField = !!field.imageUrl;
							return (
								<motion.span
									key={field.id}
									animate={
										pulseDragHint
											? {
													boxShadow: [
														"0 0 0 0px hsl(var(--primary) / 0.35)",
														"0 0 0 10px hsl(var(--primary) / 0)",
														"0 0 0 0px hsl(var(--primary) / 0.35)",
														"0 0 0 10px hsl(var(--primary) / 0)",
														"0 0 0 0px hsl(var(--primary) / 0)",
													],
												}
											: undefined
									}
									transition={
										pulseDragHint
											? { duration: 1.8, ease: "easeInOut" }
											: undefined
									}
									onPointerDown={(e) => handlePointerDown(e, field.id)}
									onPointerMove={(e) => handlePointerMove(e, field.id)}
									onPointerUp={handlePointerUp}
									onClick={(e) => {
										if (isDraggable) {
											// Selection already happens on pointerdown when draggable.
											e.stopPropagation();
											return;
										}
										if (!isParticipant) onFieldSelect(field.id);
									}}
									className="absolute select-none"
									style={{
										left: `${field.x * imageScale.scale + imageScale.offsetX}px`,
										top: `${field.y * imageScale.scale + imageScale.offsetY}px`,
										transform:
											field.anchorMode === "center"
												? "translate(-50%, -50%)"
												: "translate(0%, -50%)",

										...(isImageField
											? {
													width: `${(field.width ?? 200) * imageScale.scale}px`,
													height: `${(field.height ?? 100) * imageScale.scale}px`,
												}
											: {
													fontFamily: `"${field.font}"`,
													fontSize: `${field.fontSize * imageScale.scale}px`,
													fontWeight: field.fontWeight,
													color: field.color,
													whiteSpace: "nowrap",
												}),
										display: "inline-flex",
										alignItems: "center",
										lineHeight: "1",
										padding: isSelected ? "6px 10px" : "0",
										margin: isSelected ? "-6px -10px" : "0",
										cursor: isDraggable
											? draggingId.current === field.id
												? "grabbing"
												: "grab"
											: !isParticipant
												? "pointer"
												: "default",
										outline: isSelected
											? "2px dashed hsl(var(--primary))"
											: "none",
										outlineOffset: isSelected ? "2px" : "0",
										borderRadius: isSelected ? "4px" : "0",
										touchAction: isDraggable ? "none" : "auto",
									}}
								>
									{isImageField ? (
										<img
											src={field.imageUrl}
											alt=""
											draggable={false}
											className="h-full w-full object-contain"
										/>
									) : (
										field.text
									)}

									{isSelected && isResizable && (
										<>
											{(["tl", "tr", "bl", "br"] as const).map(
												(corner) => (
													<span
														key={corner}
														onPointerDown={(e) =>
															handleResizePointerDown(
																e,
																field,
																corner,
															)
														}
														onPointerMove={handleResizePointerMove}
														onPointerUp={handleResizePointerUp}
														className={cn(
															"absolute z-10 h-2.5 w-2.5 rounded-full border-2 border-primary bg-background",
															corner === "tl" &&
																"left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize",
															corner === "tr" &&
																"right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize",
															corner === "bl" &&
																"left-0 bottom-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize",
															corner === "br" &&
																"right-0 bottom-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize",
														)}
														style={{ touchAction: "none" }}
													/>
												),
											)}
										</>
									)}
								</motion.span>
							);
						})}
				</div>
			) : (
				<div className="flex flex-col items-center justify-center max-w-md text-center space-y-4">
					<div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
						<svg
							className="w-10 h-10 text-muted-foreground"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={1.5}
								d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
							/>
						</svg>
					</div>
					<div className="space-y-2">
						<h3 className="text-lg font-medium">
							No template uploaded
						</h3>
						<p className="text-sm text-muted-foreground">
							Upload a certificate template to get started
						</p>
					</div>
				</div>
			)}
		</motion.div>
	);
};

export default CertificatePreview;
