export interface BillingStatus {
	tier: "free" | "pro";
	status: "active" | "past_due" | "canceled" | "none";
	interval: "" | "month" | "year";
	current_period_end: string | null;
	cancel_at_period_end: boolean;
	credit_balance: number;
	is_pro: boolean;
}
