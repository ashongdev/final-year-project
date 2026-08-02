import type { FieldPreset, TextField } from "@/types/TextField";
import { format } from "date-fns";
import {
	Award,
	Building2,
	Calendar,
	Clock,
	Hash,
	PenLine,
	Type,
	User,
	type LucideIcon,
} from "lucide-react";

export const DEFAULT_DATE_FORMAT = "MMMM d, yyyy";

export const DATE_FORMAT_OPTIONS = [
	{ value: "MMMM d, yyyy", label: "MMMM D, YYYY" },
	{ value: "MMM d, yyyy", label: "MMM D, YYYY" },
	{ value: "MM/dd/yyyy", label: "MM/DD/YYYY" },
	{ value: "dd/MM/yyyy", label: "DD/MM/YYYY" },
	{ value: "yyyy-MM-dd", label: "YYYY-MM-DD" },
	{ value: "d MMMM yyyy", label: "D MMMM YYYY" },
];

export const PREDEFINED_COLORS = [
	"#000000", // Black
	"#FFFFFF", // White
	"#1E293B", // Slope Slate
	"#EF4444", // Red
	"#22C55E", // Green
	"#3B82F6", // Blue
	"#F59E0B", // Amber
	"#8B5CF6", // Violet
];

export interface FieldPresetDef {
	id: FieldPreset;
	label: string;
	description: string;
	icon: LucideIcon;
	defaultText: string;
	/** Which input widget the inspector/participant form should show. */
	inputKind: "text" | "date" | "number" | "image";
}

export const DEFAULT_SIGNATURE_WIDTH = 220;
export const DEFAULT_SIGNATURE_HEIGHT = 100;

// "text" and "name" (the always-present primary field) aren't offered in the
// Add Field menu since every template already starts with a name field;
// plain "text" is just the fallback for fields with no preset.
export const ADDABLE_FIELD_PRESETS: FieldPresetDef[] = [
	{
		id: "date",
		label: "Date",
		description: "Issue or completion date",
		icon: Calendar,
		defaultText: format(new Date(), DEFAULT_DATE_FORMAT),
		inputKind: "date",
	},
	{
		id: "course",
		label: "Course / Program",
		description: "What the certificate is for",
		icon: Award,
		defaultText: "Course Name",
		inputKind: "text",
	},
	{
		id: "organization",
		label: "Organization",
		description: "Issuing institution or company",
		icon: Building2,
		defaultText: "Organization Name",
		inputKind: "text",
	},
	{
		id: "signatory",
		label: "Signature",
		description: "Upload or draw a signature image",
		icon: PenLine,
		defaultText: "Signature",
		inputKind: "image",
	},
	{
		id: "score",
		label: "Score / Grade",
		description: "A grade, percentage, or points",
		icon: Hash,
		defaultText: "100%",
		inputKind: "number",
	},
	{
		id: "duration",
		label: "Duration",
		description: "Length of the course or program",
		icon: Clock,
		defaultText: "8 Hours",
		inputKind: "text",
	},
	{
		id: "id",
		label: "Certificate ID",
		description: "A reference or serial number",
		icon: Hash,
		defaultText: "CERT-0001",
		inputKind: "text",
	},
	{
		id: "text",
		label: "Plain Text",
		description: "No preset, just free text",
		icon: Type,
		defaultText: "New Text",
		inputKind: "text",
	},
];

export const NAME_FIELD_ICON: LucideIcon = User;

export const getPresetDef = (
	preset: FieldPreset | undefined,
): FieldPresetDef | undefined =>
	ADDABLE_FIELD_PRESETS.find((p) => p.id === preset);

/** Hidden fields never leave the editor: not rendered, not generated, not
 * included in a published participant link's payload. */
export const getVisibleFields = (fields: TextField[]): TextField[] =>
	fields.filter((f) => !f.hidden);
