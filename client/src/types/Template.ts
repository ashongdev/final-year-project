type Template = {
	id: number;
	public_id: string;
	updated_at: string;
	created_at: string;
	url: string;
	user: number | null;
	name: string | null;
	collection_id: number | null;
	trashed: boolean;
	generation_count: number;
};

export { Template };
