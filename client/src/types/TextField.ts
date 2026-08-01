export type FieldPreset =
	| "text"
	| "name"
	| "date"
	| "course"
	| "organization"
	| "signatory"
	| "score"
	| "duration"
	| "id";

export interface TextField {
	id: string;
	label: string;
	text: string;
	/** Which preset this field was created from. Defaults to "text" when absent. */
	preset?: FieldPreset;
	/** Only meaningful when preset === "date": the date-fns format string applied to rawDate. */
	dateFormat?: string;
	/** Only meaningful when preset === "date": ISO date (yyyy-MM-dd) backing the date picker. */
	rawDate?: string;
	/** Signature (or other image) URL. When set, this field renders as an image, not text. */
	imageUrl?: string;
	/**
	 * Cloudinary public_id of an ephemeral, editor-scratch signature, set only
	 * when imageUrl came from the Draw/Upload tabs, never from the Library tab.
	 * Sent back as existing_public_id on the next draw/upload for this field so
	 * it overwrites in place instead of accumulating new assets. Left unset for
	 * library-picked signatures, which must never be overwritten this way.
	 */
	signaturePublicId?: string;
	/** Only meaningful when imageUrl is set: display size in px on the certificate. */
	width?: number;
	height?: number;
	x: number;
	y: number;
	font: string;
	fontSize: number;
	fontWeight: string;
	color: string;
	anchorMode: "center" | "left";
	required?: boolean;
	/** Hidden fields are skipped on the canvas and never sent for generation. */
	hidden?: boolean;
}

export interface Recipient {
	name: string;
	email: string;
}
