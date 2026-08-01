import SignaturePad from "@/components/SignaturePad";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
	DATE_FORMAT_OPTIONS,
	DEFAULT_DATE_FORMAT,
	DEFAULT_SIGNATURE_HEIGHT,
	DEFAULT_SIGNATURE_WIDTH,
} from "@/lib/fieldPresets";
import { CERTIFICATE_FONTS, FONT_WEIGHTS } from "@/lib/utils";
import { TextField } from "@/types/TextField";
import { format, parseISO } from "date-fns";
import { motion } from "framer-motion";
import { CalendarIcon, Move, Settings2, Type } from "lucide-react";
import { useState } from "react";

const PREDEFINED_COLORS = [
	"#000000", // Black
	"#FFFFFF", // White
	"#1E293B", // Slope Slate
	"#EF4444", // Red
	"#22C55E", // Green
	"#3B82F6", // Blue
	"#F59E0B", // Amber
	"#8B5CF6", // Violet
];

interface ControlPanelProps {
	fields: TextField[];
	selectedFieldId: string;
	onFieldUpdate: (id: string, updates: Partial<TextField>) => void;
	simpleView?: boolean;
	onUploadSignature: (
		file: File | Blob,
		existingPublicId?: string,
	) => Promise<{ url: string; publicId: string } | null>;
}

const ControlPanel = ({
	fields,
	selectedFieldId,
	onFieldUpdate,
	simpleView = false,
	onUploadSignature,
}: ControlPanelProps) => {
	const activeField =
		fields.find((f) => f.id === selectedFieldId) || fields[0];
	const [isUploadingSignature, setIsUploadingSignature] = useState(false);

	// Identify if the active field is the primary (first) field
	const isPrimaryField =
		fields.length > 0 && activeField?.id === fields[0].id;
	const isSignature = activeField?.preset === "signatory";

	if (!activeField) return null;

	const handleSignatureCapture = async (file: File | Blob) => {
		setIsUploadingSignature(true);
		try {
			// Overwrites the field's own previous ephemeral asset in place
			// (if any) rather than piling up a new Cloudinary asset every
			// time the signature is redrawn/reuploaded. Never overwrites a
			// library signature — signaturePublicId is only ever set here,
			// from Draw/Upload, and is cleared when a library one is picked.
			const result = await onUploadSignature(
				file,
				activeField.signaturePublicId,
			);
			if (result) {
				onFieldUpdate(activeField.id, {
					imageUrl: result.url,
					signaturePublicId: result.publicId,
					width: activeField.width ?? DEFAULT_SIGNATURE_WIDTH,
					height: activeField.height ?? DEFAULT_SIGNATURE_HEIGHT,
				});
			}
		} finally {
			setIsUploadingSignature(false);
		}
	};

	const handleSelectLibrarySignature = (signature: {
		url: string;
		name: string;
	}) => {
		onFieldUpdate(activeField.id, {
			imageUrl: signature.url,
			// Never overwrite a library asset from the ephemeral flow.
			signaturePublicId: undefined,
			width: activeField.width ?? DEFAULT_SIGNATURE_WIDTH,
			height: activeField.height ?? DEFAULT_SIGNATURE_HEIGHT,
		});
	};

	return (
		<ScrollArea className="h-full pr-3 overflow-x-hidden">
			<motion.div
				initial={{ opacity: 0, x: 20 }}
				animate={{ opacity: 1, x: 0 }}
				transition={{ duration: 0.4, delay: 0.1 }}
				className="flex flex-col space-y-6 pl-4 pb-10"
			>
				{/* Field Settings */}
				<div className="space-y-4">
					<h3 className="text-sm font-medium flex items-center gap-2">
						<Settings2 className="w-4 h-4" />
						{simpleView ? "Text Settings" : "Selected Field"}
					</h3>

					<div className="grid grid-cols-1 gap-3">
						{!simpleView && (
							<div className="space-y-2">
								<label className="text-xs text-muted-foreground">
									Label (Internal)
								</label>
								<Input
									value={activeField.label}
									onChange={(e) =>
										onFieldUpdate(activeField.id, {
											label: e.target.value,
										})
									}
									className="h-8"
								/>
							</div>
						)}
						{isSignature ? (
							<div className="space-y-2">
								<label className="text-xs text-muted-foreground">
									Signature
								</label>
								{activeField.imageUrl ? (
									<div className="space-y-2">
										<div className="flex items-center justify-center rounded-md border border-border bg-muted/30 p-3">
											<img
												src={activeField.imageUrl}
												alt="Signature"
												className="max-h-16 object-contain"
											/>
										</div>
										<Button
											type="button"
											variant="outline"
											size="sm"
											className="w-full"
											onClick={() =>
												onFieldUpdate(activeField.id, {
													imageUrl: undefined,
												})
											}
										>
											Replace Signature
										</Button>
									</div>
								) : (
									<SignaturePad
										penColor={activeField.color}
										isUploading={isUploadingSignature}
										onCapture={handleSignatureCapture}
										onSelectLibrary={handleSelectLibrarySignature}
									/>
								)}
							</div>
						) : activeField.preset === "date" ? (
							<div className="space-y-2">
								<label className="text-xs text-muted-foreground">
									Date
								</label>
								<div className="flex gap-2">
									<Popover>
										<PopoverTrigger asChild>
											<button className="flex h-8 flex-1 items-center gap-2 rounded-md border border-input bg-background px-3 text-xs">
												<CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
												{activeField.text}
											</button>
										</PopoverTrigger>
										<PopoverContent className="w-auto p-0" align="start">
											<Calendar
												mode="single"
												selected={
													activeField.rawDate
														? parseISO(activeField.rawDate)
														: undefined
												}
												onSelect={(date) => {
													if (!date) return;
													const dateFormat =
														activeField.dateFormat ??
														DEFAULT_DATE_FORMAT;
													onFieldUpdate(activeField.id, {
														rawDate: format(date, "yyyy-MM-dd"),
														text: format(date, dateFormat),
													});
												}}
												initialFocus
											/>
										</PopoverContent>
									</Popover>
									<Select
										value={activeField.dateFormat ?? DEFAULT_DATE_FORMAT}
										onValueChange={(dateFormat) => {
											// If a real date has been picked, reformat it;
											// otherwise keep showing the pattern itself as a
											// placeholder, updated to match the new format.
											const updates: Partial<TextField> = {
												dateFormat,
												text: activeField.rawDate
													? format(
															parseISO(activeField.rawDate),
															dateFormat,
														)
													: dateFormat,
											};
											onFieldUpdate(activeField.id, updates);
										}}
									>
										<SelectTrigger className="h-8 w-[110px] shrink-0 text-xs">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{DATE_FORMAT_OPTIONS.map((opt) => (
												<SelectItem
													key={opt.value}
													value={opt.value}
													className="text-xs"
												>
													{opt.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</div>
						) : (
							<div className="space-y-2">
								<label className="text-xs text-muted-foreground">
									Preview Text
								</label>
								<Input
									value={activeField.text}
									onChange={(e) =>
										onFieldUpdate(activeField.id, {
											text: e.target.value,
										})
									}
									className="h-8"
								/>
							</div>
						)}
						{!simpleView && !isSignature && (
							<div
								className="flex items-center justify-between border rounded-md p-2"
								data-tour="required-toggle"
							>
								<label
									className={`text-xs ${
										isPrimaryField
											? "text-muted-foreground/50"
											: "text-muted-foreground"
									}`}
								>
									Required for Participant
								</label>
								<Switch
									checked={
										isPrimaryField ||
										(activeField.required ?? false)
									}
									disabled={isPrimaryField}
									onCheckedChange={(checked) =>
										onFieldUpdate(activeField.id, {
											required: checked,
										})
									}
								/>
							</div>
						)}
						{!isPrimaryField && (
							<div className="flex items-center justify-between border rounded-md p-2">
								<label className="text-xs text-muted-foreground">
									Visible on Certificate
								</label>
								<Switch
									checked={!activeField.hidden}
									onCheckedChange={(checked) =>
										onFieldUpdate(activeField.id, {
											hidden: !checked,
										})
									}
								/>
							</div>
						)}
					</div>
				</div>

				<Separator />

				{/* Position */}
				<div className="space-y-3">
					<h3 className="text-sm font-medium flex items-center gap-2">
						<Move className="w-4 h-4" />
						Position
					</h3>
					<p className="text-xs text-muted-foreground -mt-2">
						Drag the text on the canvas, or fine-tune here.
					</p>
					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-2">
							<label className="text-xs text-muted-foreground">
								X
							</label>
							<Input
								type="number"
								value={activeField.x}
								onChange={(e) =>
									onFieldUpdate(activeField.id, {
										x: Number(e.target.value),
									})
								}
								className="h-8"
							/>
						</div>
						<div className="space-y-2">
							<label className="text-xs text-muted-foreground">
								Y
							</label>
							<Input
								type="number"
								value={activeField.y}
								onChange={(e) =>
									onFieldUpdate(activeField.id, {
										y: Number(e.target.value),
									})
								}
								className="h-8"
							/>
						</div>
					</div>
					{isSignature && activeField.imageUrl && (
						<div className="grid grid-cols-2 gap-3">
							<div className="space-y-2">
								<label className="text-xs text-muted-foreground">
									Width
								</label>
								<Input
									type="number"
									value={activeField.width ?? DEFAULT_SIGNATURE_WIDTH}
									onChange={(e) =>
										onFieldUpdate(activeField.id, {
											width: Number(e.target.value),
										})
									}
									min={20}
									max={1000}
									className="h-8"
								/>
							</div>
							<div className="space-y-2">
								<label className="text-xs text-muted-foreground">
									Height
								</label>
								<Input
									type="number"
									value={activeField.height ?? DEFAULT_SIGNATURE_HEIGHT}
									onChange={(e) =>
										onFieldUpdate(activeField.id, {
											height: Number(e.target.value),
										})
									}
									min={20}
									max={1000}
									className="h-8"
								/>
							</div>
						</div>
					)}
					<div className="flex items-center justify-between border rounded-md p-2">
						<div>
							<p className="text-xs font-medium">
								{isSignature ? "Anchor" : "Text Anchor"}
							</p>
							<p className="text-xs text-muted-foreground">
								{activeField.anchorMode === "center"
									? "Center"
									: "Top-Left"}
							</p>
						</div>
						<Switch
							checked={activeField.anchorMode === "left"}
							onCheckedChange={(checked) =>
								onFieldUpdate(activeField.id, {
									anchorMode: checked ? "left" : "center",
								})
							}
						/>
					</div>
				</div>

				{!isSignature && (
					<>
						<Separator />

						{/* Font Family */}
						<div className="space-y-2">
							<h3 className="text-sm font-medium flex items-center gap-2">
								<Type className="w-4 h-4" />
								Typography
							</h3>
							<label className="text-xs text-muted-foreground">
								Font Family
							</label>
							<Select
								value={activeField.font}
								onValueChange={(val) =>
									onFieldUpdate(activeField.id, { font: val })
								}
							>
								<SelectTrigger className="w-full h-8">
									<SelectValue placeholder="Select font" />
								</SelectTrigger>
								<SelectContent>
									{CERTIFICATE_FONTS.map((font) => (
										<SelectItem key={font.value} value={font.value}>
											<span style={{ fontFamily: font.value }}>
												{font.label}
											</span>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="grid grid-cols-2 gap-3">
							{/* Font Size */}
							<div className="space-y-2">
								<label className="text-xs text-muted-foreground">
									Size (px)
								</label>
								<Input
									type="number"
									value={activeField.fontSize}
									onChange={(e) =>
										onFieldUpdate(activeField.id, {
											fontSize: Number(e.target.value),
										})
									}
									min={8}
									max={300}
									className="h-8"
								/>
							</div>

							{/* Font Weight */}
							<div className="space-y-2">
								<label className="text-xs text-muted-foreground">
									Weight
								</label>
								<Select
									value={activeField.fontWeight}
									onValueChange={(val) =>
										onFieldUpdate(activeField.id, {
											fontWeight: val,
										})
									}
								>
									<SelectTrigger className="w-full h-8">
										<SelectValue placeholder="Weight" />
									</SelectTrigger>
									<SelectContent>
										{FONT_WEIGHTS.map((weight) => (
											<SelectItem
												key={weight.value}
												value={weight.value}
											>
												{weight.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
					</>
				)}

				<Separator />

				{/* Color */}
				<div className="space-y-2">
					<label className="text-xs text-muted-foreground">
						{isSignature ? "Pen Color" : "Color"}
					</label>
					<div className="flex flex-col gap-2">
						<div className="flex flex-wrap gap-1.5">
							{PREDEFINED_COLORS.map((color) => (
								<button
									key={color}
									className={`w-6 h-6 rounded-full border shadow-sm transition-transform hover:scale-110 active:scale-95 ${
										activeField.color === color
											? "ring-2 ring-primary ring-offset-2"
											: ""
									}`}
									style={{ backgroundColor: color }}
									onClick={() =>
										onFieldUpdate(activeField.id, {
											color: color,
										})
									}
								/>
							))}
						</div>
						<div className="flex gap-2">
							<Input
								type="color"
								value={activeField.color}
								onChange={(e) =>
									onFieldUpdate(activeField.id, {
										color: e.target.value,
									})
								}
								className="w-10 h-8 p-0 border-0 cursor-pointer"
							/>
							<Input
								type="text"
								value={activeField.color}
								onChange={(e) =>
									onFieldUpdate(activeField.id, {
										color: e.target.value,
									})
								}
								className="flex-1 h-8 font-mono uppercase"
							/>
						</div>
					</div>
				</div>
			</motion.div>
		</ScrollArea>
	);
};

export default ControlPanel;
