import type { MarketplaceTemplate } from "@/types/MarketplaceTemplate";

const baseField = (
	overrides: Partial<MarketplaceTemplate["fields"][0]> &
		Pick<MarketplaceTemplate["fields"][0], "x" | "y">,
): MarketplaceTemplate["fields"][0] => ({
	id: "field-1",
	label: "Participant Name",
	text: "John Doe",
	x: 0,
	y: 0,
	font: "Bickham Script Pro Regular",
	fontSize: 100,
	fontWeight: "300",
	color: "#000000",
	anchorMode: "center",
	required: true,
	...overrides,
});

export const MARKETPLACE_CATEGORIES = [
	{ id: "all" as const, label: "All Templates" },
	{ id: "classic" as const, label: "Classic" },
	{ id: "modern" as const, label: "Modern" },
	{ id: "academic" as const, label: "Academic" },
	{ id: "corporate" as const, label: "Corporate" },
	{ id: "creative" as const, label: "Creative" },
];

export const marketplaceTemplates: MarketplaceTemplate[] = [
	{
		id: "classic-gold",
		name: "Classic Gold",
		description:
			"Traditional certificate with ornate gold borders. Ideal for formal awards and achievements.",
		category: "classic",
		imageUrl: "/marketplace/classic-gold.svg",
		tags: ["formal", "gold", "achievement"],
		fields: [
			baseField({
				x: 707,
				y: 430,
				fontSize: 72,
				color: "#8b6914",
				fontWeight: "400",
			}),
		],
	},
	{
		id: "modern-minimal",
		name: "Modern Minimal",
		description:
			"Clean, contemporary design with bold typography. Perfect for workshops and online courses.",
		category: "modern",
		imageUrl: "/marketplace/modern-minimal.svg",
		tags: ["minimal", "clean", "workshop"],
		fields: [
			baseField({
				x: 707,
				y: 470,
				fontSize: 80,
				color: "#1a1a2e",
				fontWeight: "300",
			}),
		],
	},
	{
		id: "academic-navy",
		name: "Academic Navy",
		description:
			"Prestigious navy-themed certificate suited for schools, universities, and academic programs.",
		category: "academic",
		imageUrl: "/marketplace/academic-navy.svg",
		tags: ["school", "university", "excellence"],
		fields: [
			baseField({
				x: 707,
				y: 450,
				fontSize: 68,
				color: "#1e3a5f",
				fontWeight: "400",
			}),
		],
	},
	{
		id: "corporate-blue",
		name: "Corporate Blue",
		description:
			"Professional branded layout for employee recognition, training completion, and corporate events.",
		category: "corporate",
		imageUrl: "/marketplace/corporate-blue.svg",
		tags: ["business", "employee", "appreciation"],
		fields: [
			baseField({
				x: 707,
				y: 430,
				fontSize: 76,
				color: "#003d7a",
				fontWeight: "500",
			}),
		],
	},
	{
		id: "creative-gradient",
		name: "Creative Gradient",
		description:
			"Vibrant hackathon and event certificate with a modern gradient accent. Great for tech events.",
		category: "creative",
		imageUrl: "/marketplace/creative-gradient.svg",
		tags: ["hackathon", "event", "winner"],
		fields: [
			baseField({
				x: 707,
				y: 460,
				fontSize: 84,
				color: "#764ba2",
				fontWeight: "600",
			}),
		],
	},
	{
		id: "elegant-floral",
		name: "Elegant Floral",
		description:
			"Warm, decorative certificate for participation awards, community events, and special occasions.",
		category: "classic",
		imageUrl: "/marketplace/elegant-floral.svg",
		tags: ["participation", "event", "warm"],
		fields: [
			baseField({
				x: 707,
				y: 440,
				fontSize: 70,
				color: "#8b5a2b",
				fontWeight: "400",
				font: "Georgia",
			}),
		],
	},
];
