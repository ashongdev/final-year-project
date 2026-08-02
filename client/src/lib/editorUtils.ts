import { toast } from "sonner";
import type { NavigateFunction } from "react-router-dom";
import type { MarketplaceTemplate, TemplateUseMode } from "@/types/MarketplaceTemplate";
import type { Template } from "@/types/Template";
import type { TextField } from "@/types/TextField";

export const restartTour = (resetTour: () => void, startTour: () => void) => {
	resetTour();
	startTour();
};

export const copyLinkToClipboard = async (link: string) => {
	await navigator.clipboard.writeText(link);
	toast.success("Copied to clipboard");
};

export const openTemplateInEditor = (
	navigate: NavigateFunction,
	template: Template,
) => {
	// The editor loads the real template + its saved field layout itself
	// from ?id= (see CertificateEditor's draft-loading effect) — this used
	// to hand over a hardcoded fake field via location.state instead,
	// silently discarding whatever the organizer had actually configured.
	navigate(`/editor?id=${encodeURIComponent(template.public_id)}`);
};

const SAMPLE_RECIPIENTS = [
	{ name: "Jane Smith", email: "jane@example.com" },
	{ name: "Alex Johnson", email: "alex@example.com" },
];

export const buildMarketplaceFields = (
	template: MarketplaceTemplate,
	mode: TemplateUseMode,
): TextField[] => {
	if (mode === "testing") {
		return template.fields.map((field, index) => ({
			...field,
			text:
				index === 0
					? "Sample Participant"
					: field.text || "Sample Text",
		}));
	}

	return template.fields.map((field) => ({
		...field,
		text: "",
	}));
};

export const openMarketplaceTemplateInEditor = (
	navigate: NavigateFunction,
	template: MarketplaceTemplate,
	mode: TemplateUseMode,
) => {
	const fields = buildMarketplaceFields(template, mode);

	navigate("/editor", {
		state: {
			templateUrl: template.imageUrl,
			fields,
			templateFile: null,
			marketplaceTemplateId: template.id,
			templateUseMode: mode,
			recipients: mode === "testing" ? SAMPLE_RECIPIENTS : [],
		},
	});
};
