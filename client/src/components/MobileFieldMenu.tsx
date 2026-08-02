import {
	AnchorControl,
	ColorControl,
	FontFamilyControl,
	FontSizeControl,
	FontWeightControl,
} from "@/components/field-controls/TextFieldControls";
import DateFieldControl from "@/components/field-controls/DateFieldControl";
import SignatureFieldControl from "@/components/field-controls/SignatureFieldControl";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useSignatureFieldActions } from "@/hooks/useSignatureFieldActions";
import { DEFAULT_SIGNATURE_HEIGHT, DEFAULT_SIGNATURE_WIDTH } from "@/lib/fieldPresets";
import { TextField } from "@/types/TextField";
import {
	AlignHorizontalJustifyStart,
	Bold,
	CalendarIcon,
	ChevronLeft,
	ChevronRight,
	PenLine,
	Ruler,
	Trash2,
	Type,
} from "lucide-react";
import { useEffect, useState } from "react";

type Category =
	| "date"
	| "signature"
	| "font"
	| "size"
	| "weight"
	| "color"
	| "anchor";

interface MobileFieldMenuProps {
	field: TextField | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	initialCategory?: Category | null;
	onFieldUpdate: (id: string, updates: Partial<TextField>) => void;
	onRemoveField: (id: string) => void;
	simpleView: boolean;
	isPrimaryField: boolean;
	onUploadSignature: (
		file: File | Blob,
		existingPublicId?: string,
	) => Promise<{ url: string; publicId: string } | null>;
}

const MobileFieldMenu = ({
	field,
	open,
	onOpenChange,
	initialCategory,
	onFieldUpdate,
	onRemoveField,
	simpleView,
	isPrimaryField,
	onUploadSignature,
}: MobileFieldMenuProps) => {
	const [category, setCategory] = useState<Category | null>(null);
	const { isUploading, handleCapture, handleSelectLibrary } =
		useSignatureFieldActions(onUploadSignature, onFieldUpdate);

	useEffect(() => {
		if (open) setCategory(initialCategory ?? null);
	}, [open, initialCategory]);

	if (!field) return null;

	const isSignature = field.preset === "signatory";
	const isDate = field.preset === "date";
	const boundUpdate = (updates: Partial<TextField>) =>
		onFieldUpdate(field.id, updates);

	const categories: { id: Category; label: string; icon: typeof Type }[] = [
		...(isDate ? [{ id: "date" as const, label: "Date", icon: CalendarIcon }] : []),
		...(isSignature
			? [{ id: "signature" as const, label: "Signature", icon: PenLine }]
			: []),
		...(!isSignature
			? [
					{ id: "font" as const, label: "Font", icon: Type },
					{ id: "weight" as const, label: "Weight", icon: Bold },
				]
			: []),
		{ id: "size" as const, label: "Size", icon: Ruler },
		{
			id: "color" as const,
			label: isSignature ? "Pen Color" : "Color",
			icon: PenLine,
		},
		{
			id: "anchor" as const,
			label: isSignature ? "Anchor" : "Text Anchor",
			icon: AlignHorizontalJustifyStart,
		},
	];

	const renderCategory = () => {
		switch (category) {
			case "date":
				return <DateFieldControl field={field} onFieldUpdate={boundUpdate} />;
			case "signature":
				return (
					<SignatureFieldControl
						field={field}
						onFieldUpdate={boundUpdate}
						isUploading={isUploading}
						onCapture={(file) => handleCapture(field, file)}
						onSelectLibrary={(signature) =>
							handleSelectLibrary(field, signature)
						}
					/>
				);
			case "font":
				return <FontFamilyControl field={field} onFieldUpdate={boundUpdate} />;
			case "weight":
				return <FontWeightControl field={field} onFieldUpdate={boundUpdate} />;
			case "size":
				return isSignature ? (
					<div className="space-y-5">
						<div className="space-y-3">
							<div className="flex items-center justify-between">
								<label className="text-xs text-muted-foreground">
									Width
								</label>
								<span className="text-xs font-medium text-foreground">
									{field.width ?? DEFAULT_SIGNATURE_WIDTH}
								</span>
							</div>
							<Slider
								value={[field.width ?? DEFAULT_SIGNATURE_WIDTH]}
								onValueChange={([value]) =>
									boundUpdate({ width: value })
								}
								min={20}
								max={1000}
								step={1}
							/>
						</div>
						<div className="space-y-3">
							<div className="flex items-center justify-between">
								<label className="text-xs text-muted-foreground">
									Height
								</label>
								<span className="text-xs font-medium text-foreground">
									{field.height ?? DEFAULT_SIGNATURE_HEIGHT}
								</span>
							</div>
							<Slider
								value={[field.height ?? DEFAULT_SIGNATURE_HEIGHT]}
								onValueChange={([value]) =>
									boundUpdate({ height: value })
								}
								min={20}
								max={1000}
								step={1}
							/>
						</div>
					</div>
				) : (
					<FontSizeControl
						field={field}
						onFieldUpdate={boundUpdate}
						variant="slider"
					/>
				);
			case "color":
				return (
					<ColorControl
						field={field}
						onFieldUpdate={boundUpdate}
						label={isSignature ? "Pen Color" : "Color"}
					/>
				);
			case "anchor":
				return (
					<AnchorControl
						field={field}
						onFieldUpdate={boundUpdate}
						label={isSignature ? "Anchor" : "Text Anchor"}
					/>
				);
			default:
				return null;
		}
	};

	const activeCategory = categories.find((c) => c.id === category);

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="bottom" className="max-h-[75vh] overflow-y-auto">
				<SheetHeader>
					<SheetTitle className="flex items-center gap-2">
						{category && (
							<button
								type="button"
								onClick={() => setCategory(null)}
								className="text-muted-foreground"
								aria-label="Back"
							>
								<ChevronLeft className="h-4 w-4" />
							</button>
						)}
						{activeCategory ? activeCategory.label : field.label}
					</SheetTitle>
				</SheetHeader>

				{category ? (
					<div className="py-4">{renderCategory()}</div>
				) : (
					<div className="divide-y divide-border py-2">
						{categories.map((c) => (
							<button
								key={c.id}
								type="button"
								onClick={() => setCategory(c.id)}
								className="flex w-full items-center gap-3 py-3 text-left"
							>
								<c.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
								<span className="flex-1 text-sm">{c.label}</span>
								<ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
							</button>
						))}

						{!simpleView && !isSignature && (
							<div className="flex items-center justify-between py-3">
								<span
									className={`text-sm ${
										isPrimaryField
											? "text-muted-foreground/50"
											: "text-foreground"
									}`}
								>
									Required for Participant
								</span>
								<Switch
									checked={isPrimaryField || (field.required ?? false)}
									disabled={isPrimaryField}
									onCheckedChange={(checked) =>
										boundUpdate({ required: checked })
									}
								/>
							</div>
						)}
						{!simpleView && !isPrimaryField && (
							<div className="flex items-center justify-between py-3">
								<span className="text-sm text-foreground">
									Visible on Certificate
								</span>
								<Switch
									checked={!field.hidden}
									onCheckedChange={(checked) =>
										boundUpdate({ hidden: !checked })
									}
								/>
							</div>
						)}
						{!simpleView && !isPrimaryField && (
							<div className="py-3">
								<Button
									type="button"
									variant="ghost"
									className="w-full justify-start gap-2 text-destructive hover:text-destructive"
									onClick={() => {
										onRemoveField(field.id);
										onOpenChange(false);
									}}
								>
									<Trash2 className="h-4 w-4" />
									Remove Field
								</Button>
							</div>
						)}
					</div>
				)}
			</SheetContent>
		</Sheet>
	);
};

export default MobileFieldMenu;
