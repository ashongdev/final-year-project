import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { PREDEFINED_COLORS } from "@/lib/fieldPresets";
import { CERTIFICATE_FONTS, FONT_WEIGHTS } from "@/lib/utils";
import { TextField } from "@/types/TextField";

interface FieldControlProps {
	field: TextField;
	onFieldUpdate: (updates: Partial<TextField>) => void;
}

export const FontFamilyControl = ({ field, onFieldUpdate }: FieldControlProps) => (
	<div className="space-y-2">
		<label className="text-xs text-muted-foreground">Font Family</label>
		<Select
			value={field.font}
			onValueChange={(val) => onFieldUpdate({ font: val })}
		>
			<SelectTrigger className="w-full h-8">
				<SelectValue placeholder="Select font" />
			</SelectTrigger>
			<SelectContent>
				{CERTIFICATE_FONTS.map((font) => (
					<SelectItem key={font.value} value={font.value}>
						<span style={{ fontFamily: font.value }}>{font.label}</span>
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	</div>
);

export const FontSizeControl = ({ field, onFieldUpdate }: FieldControlProps) => (
	<div className="space-y-2">
		<label className="text-xs text-muted-foreground">Size (px)</label>
		<Input
			type="number"
			value={field.fontSize}
			onChange={(e) => onFieldUpdate({ fontSize: Number(e.target.value) })}
			min={8}
			max={300}
			className="h-8"
		/>
	</div>
);

export const FontWeightControl = ({ field, onFieldUpdate }: FieldControlProps) => (
	<div className="space-y-2">
		<label className="text-xs text-muted-foreground">Weight</label>
		<Select
			value={field.fontWeight}
			onValueChange={(val) => onFieldUpdate({ fontWeight: val })}
		>
			<SelectTrigger className="w-full h-8">
				<SelectValue placeholder="Weight" />
			</SelectTrigger>
			<SelectContent>
				{FONT_WEIGHTS.map((weight) => (
					<SelectItem key={weight.value} value={weight.value}>
						{weight.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	</div>
);

export const ColorControl = ({
	field,
	onFieldUpdate,
	label = "Color",
}: FieldControlProps & { label?: string }) => (
	<div className="space-y-2">
		<label className="text-xs text-muted-foreground">{label}</label>
		<div className="flex flex-col gap-2">
			<div className="flex flex-wrap gap-1.5">
				{PREDEFINED_COLORS.map((color) => (
					<button
						key={color}
						className={`w-6 h-6 rounded-full border shadow-sm transition-transform hover:scale-110 active:scale-95 ${
							field.color === color ? "ring-2 ring-primary ring-offset-2" : ""
						}`}
						style={{ backgroundColor: color }}
						onClick={() => onFieldUpdate({ color })}
					/>
				))}
			</div>
			<div className="flex gap-2">
				<Input
					type="color"
					value={field.color}
					onChange={(e) => onFieldUpdate({ color: e.target.value })}
					className="w-10 h-8 p-0 border-0 cursor-pointer"
				/>
				<Input
					type="text"
					value={field.color}
					onChange={(e) => onFieldUpdate({ color: e.target.value })}
					className="flex-1 h-8 font-mono uppercase"
				/>
			</div>
		</div>
	</div>
);

export const AnchorControl = ({
	field,
	onFieldUpdate,
	label = "Text Anchor",
}: FieldControlProps & { label?: string }) => (
	<div className="flex items-center justify-between border rounded-md p-2">
		<div>
			<p className="text-xs font-medium">{label}</p>
			<p className="text-xs text-muted-foreground">
				{field.anchorMode === "center" ? "Center" : "Top-Left"}
			</p>
		</div>
		<Switch
			checked={field.anchorMode === "left"}
			onCheckedChange={(checked) =>
				onFieldUpdate({ anchorMode: checked ? "left" : "center" })
			}
		/>
	</div>
);
