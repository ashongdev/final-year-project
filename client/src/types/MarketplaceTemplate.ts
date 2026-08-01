import type { TextField } from "./TextField";

export type MarketplaceCategory =
	| "all"
	| "classic"
	| "modern"
	| "academic"
	| "corporate"
	| "creative";

export interface MarketplaceTemplate {
	id: string;
	name: string;
	description: string;
	category: Exclude<MarketplaceCategory, "all">;
	imageUrl: string;
	tags: string[];
	fields: TextField[];
}

export type TemplateUseMode = "testing" | "actual";
