import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export const CERTIFICATE_FONTS = [
	{
		value: "Bickham Script Pro Regular",
		label: "Bickham Script Pro Regular",
	},
	{ value: "Great Vibes", label: "Great Vibes" },
	{ value: "Alex Brush", label: "Alex Brush" },
	{ value: "Snell Roundhand", label: "Snell Roundhand" },
	{ value: "Kunstler Script", label: "Kunstler Script" },
	{ value: "Garamond", label: "Garamond" },
	{ value: "Times New Roman", label: "Times New Roman" },
	{ value: "Cinzel", label: "Cinzel" },
	{ value: "Georgia", label: "Georgia" },
	{ value: "Libre Baskerville", label: "Libre Baskerville" },
	{ value: "Marcellus", label: "Marcellus" },
	{ value: "Playfair Display", label: "Playfair Display" },
	{ value: "Cormorant Garamond", label: "Cormorant Garamond" },
	{ value: "Crimson Text", label: "Crimson Text" },
	{ value: "Montserrat", label: "Montserrat" },
	{ value: "Raleway", label: "Raleway" },
	{ value: "Lato", label: "Lato" },
	{ value: "Open Sans", label: "Open Sans" },
	{ value: "Inter", label: "Inter" },
];

export const FONT_WEIGHTS = [
	{ value: "300", label: "Light" },
	{ value: "400", label: "Regular" },
	{ value: "500", label: "Medium" },
	{ value: "600", label: "Semi Bold" },
	{ value: "700", label: "Bold" },
	{ value: "800", label: "Extra Bold" },
];

export const PREDEFINED_COLORS = [
	{ value: "#000000", label: "Black" },
	{ value: "#FFFFFF", label: "White" },
	{ value: "#FF0000", label: "Red" },
	{ value: "#00FF00", label: "Green" },
	{ value: "#0000FF", label: "Blue" },
	{ value: "#FFFF00", label: "Yellow" },
	{ value: "#FF00FF", label: "Magenta" },
	{ value: "#00FFFF", label: "Cyan" },
	{ value: "#FFA500", label: "Orange" },
	{ value: "#800080", label: "Purple" },
	{ value: "#FFD700", label: "Gold" },
	{ value: "#C0C0C0", label: "Silver" },
];
