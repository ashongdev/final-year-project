import {
	AnchorControl,
	ColorControl,
	FontFamilyControl,
	FontSizeControl,
	FontWeightControl,
} from "@/components/field-controls/TextFieldControls";
import DateFieldControl from "@/components/field-controls/DateFieldControl";
import SignatureFieldControl from "@/components/field-controls/SignatureFieldControl";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { DEFAULT_SIGNATURE_HEIGHT, DEFAULT_SIGNATURE_WIDTH } from "@/lib/fieldPresets";
import { useSignatureFieldActions } from "@/hooks/useSignatureFieldActions";
import { TextField } from "@/types/TextField";
import { motion } from "framer-motion";
import { Move, Settings2, Type } from "lucide-react";

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
	const { isUploading, handleCapture, handleSelectLibrary } =
		useSignatureFieldActions(onUploadSignature, onFieldUpdate);

	// Identify if the active field is the primary (first) field
	const isPrimaryField =
		fields.length > 0 && activeField?.id === fields[0].id;
	const isSignature = activeField?.preset === "signatory";

	if (!activeField) return null;

	const boundUpdate = (updates: Partial<TextField>) =>
		onFieldUpdate(activeField.id, updates);

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
										boundUpdate({ label: e.target.value })
									}
									className="h-8"
								/>
							</div>
						)}
						{isSignature ? (
							<SignatureFieldControl
								field={activeField}
								onFieldUpdate={boundUpdate}
								isUploading={isUploading}
								onCapture={(file) => handleCapture(activeField, file)}
								onSelectLibrary={(signature) =>
									handleSelectLibrary(activeField, signature)
								}
							/>
						) : activeField.preset === "date" ? (
							<DateFieldControl
								field={activeField}
								onFieldUpdate={boundUpdate}
							/>
						) : (
							<div className="space-y-2">
								<label className="text-xs text-muted-foreground">
									Preview Text
								</label>
								<Input
									value={activeField.text}
									onChange={(e) =>
										boundUpdate({ text: e.target.value })
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
										boundUpdate({ required: checked })
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
										boundUpdate({ hidden: !checked })
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
									boundUpdate({ x: Number(e.target.value) })
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
									boundUpdate({ y: Number(e.target.value) })
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
										boundUpdate({ width: Number(e.target.value) })
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
										boundUpdate({ height: Number(e.target.value) })
									}
									min={20}
									max={1000}
									className="h-8"
								/>
							</div>
						</div>
					)}
					<AnchorControl
						field={activeField}
						onFieldUpdate={boundUpdate}
						label={isSignature ? "Anchor" : "Text Anchor"}
					/>
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
							<FontFamilyControl
								field={activeField}
								onFieldUpdate={boundUpdate}
							/>
						</div>

						<div className="grid grid-cols-2 gap-3">
							<FontSizeControl
								field={activeField}
								onFieldUpdate={boundUpdate}
							/>
							<FontWeightControl
								field={activeField}
								onFieldUpdate={boundUpdate}
							/>
						</div>
					</>
				)}

				<Separator />

				{/* Color */}
				<ColorControl
					field={activeField}
					onFieldUpdate={boundUpdate}
					label={isSignature ? "Pen Color" : "Color"}
				/>
			</motion.div>
		</ScrollArea>
	);
};

export default ControlPanel;
