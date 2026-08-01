export interface Collection {
	id: number;
	name: string;
	created_at: string;
	updated_at?: string;
	state?: string;
	template_count?: number;
}
