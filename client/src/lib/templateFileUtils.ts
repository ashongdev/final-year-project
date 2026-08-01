const loadImage = (src: string): Promise<HTMLImageElement> =>
	new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = reject;
		img.src = src;
	});

const svgBlobToPngFile = async (
	blob: Blob,
	filename: string,
): Promise<File> => {
	const objectUrl = URL.createObjectURL(blob);
	try {
		const img = await loadImage(objectUrl);
		const canvas = document.createElement("canvas");
		canvas.width = img.naturalWidth || 1414;
		canvas.height = img.naturalHeight || 1000;
		const ctx = canvas.getContext("2d");
		if (!ctx) {
			throw new Error("Could not get canvas context");
		}
		ctx.drawImage(img, 0, 0);
		const pngBlob = await new Promise<Blob>((resolve, reject) => {
			canvas.toBlob((result) => {
				if (result) resolve(result);
				else reject(new Error("Failed to convert template"));
			}, "image/png");
		});
		return new File([pngBlob], filename.replace(/\.svg$/i, ".png"), {
			type: "image/png",
		});
	} finally {
		URL.revokeObjectURL(objectUrl);
	}
};

export const hasTemplateSource = (
	templateFile: File | null,
	templateUrl: string | null,
): boolean => Boolean(templateFile || templateUrl);

export const resolveTemplateFile = async (
	templateFile: File | null,
	templateUrl: string | null,
): Promise<File | null> => {
	if (templateFile) return templateFile;
	if (!templateUrl) return null;

	try {
		const response = await fetch(templateUrl);
		if (!response.ok) {
			throw new Error("Failed to fetch template");
		}

		const blob = await response.blob();
		const isSvg =
			blob.type === "image/svg+xml" ||
			templateUrl.toLowerCase().includes(".svg");

		if (isSvg) {
			return svgBlobToPngFile(blob, "template.png");
		}

		const extension = blob.type.split("/")[1] || "png";
		return new File([blob], `template.${extension}`, {
			type: blob.type || "image/png",
		});
	} catch {
		return null;
	}
};
