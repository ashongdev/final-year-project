export interface DailyPoint {
	date: string;
	editor: number;
	self_serve: number;
	batch: number;
	total: number;
}

export interface ActivityDailyPoint {
	date: string;
	templates_created: number;
	links_shared: number;
	templates_loaded: number;
}

export interface TopTemplate {
	id: number;
	name: string;
	public_id: string;
	url: string;
	generation_count: number;
}

export type ActivityKind =
	| "editor"
	| "self_serve"
	| "batch"
	| "link_shared"
	| "template_loaded";

export interface RecentActivityItem {
	type: "generation" | "activity";
	kind: ActivityKind;
	template_name: string | null;
	label: string;
	count: number;
	created_at: string;
}

export interface Analytics {
	total_generated: number;
	by_kind: {
		editor: number;
		self_serve: number;
		batch: number;
	};
	daily: DailyPoint[];
	templates_created_total: number;
	links_shared_total: number;
	templates_loaded_total: number;
	activity_daily: ActivityDailyPoint[];
	top_templates: TopTemplate[];
	recipients_invited: number;
	gated_templates: number;
	codes_requested: number;
	codes_verified: number;
	recent_activity: RecentActivityItem[];
}
