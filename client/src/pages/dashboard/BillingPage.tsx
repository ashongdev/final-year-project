import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthContext } from "@/hooks/useAuthContext";
import { fetchBillingStatus, openBillingPortal } from "@/services/billingApi";
import type { BillingStatus } from "@/types/Billing";
import { format, parseISO } from "date-fns";
import { CreditCard, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

const BillingPage = () => {
	const { BASE_URL, refreshAuth } = useAuthContext();
	const [status, setStatus] = useState<BillingStatus | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isOpeningPortal, setIsOpeningPortal] = useState(false);
	const [searchParams, setSearchParams] = useSearchParams();

	const load = async () => {
		setIsLoading(true);
		try {
			const result = await fetchBillingStatus(BASE_URL);
			setStatus(result);
		} catch {
			toast.error("Failed to load billing status");
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		void load();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [BASE_URL]);

	useEffect(() => {
		const checkout = searchParams.get("checkout");
		if (checkout === "success") {
			toast.success("Payment received! It may take a few seconds to reflect below.");
			void refreshAuth();
			setSearchParams({}, { replace: true });
		} else if (checkout === "cancelled") {
			setSearchParams({}, { replace: true });
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [searchParams]);

	const handleManageBilling = async () => {
		setIsOpeningPortal(true);
		try {
			const url = await openBillingPortal(BASE_URL);
			window.location.href = url;
		} catch {
			toast.error("Couldn't open the billing portal");
			setIsOpeningPortal(false);
		}
	};

	return (
		<div className="space-y-6">
			{isLoading ? (
				<div className="space-y-4">
					<Skeleton className="h-32 w-full max-w-md" />
				</div>
			) : status ? (
				<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
					{/* Plan card */}
					<div className="border border-border bg-card p-6">
						<div className="flex items-center justify-between">
							<h3 className="font-playfair text-xl italic text-foreground">
								{status.is_pro ? "Pro" : "Free"}
							</h3>
							{status.is_pro && (
								<span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary">
									{status.interval === "year" ? "Annual" : "Monthly"}
								</span>
							)}
						</div>

						{status.is_pro ? (
							<div className="mt-3 space-y-1 text-sm text-muted-foreground">
								{status.current_period_end && (
									<p>
										{status.cancel_at_period_end
											? "Access ends"
											: "Renews"}{" "}
										{format(
											parseISO(status.current_period_end),
											"MMMM d, yyyy",
										)}
									</p>
								)}
								{status.status === "past_due" && (
									<p className="text-destructive">
										Your last payment failed. Update your card to
										keep Pro access.
									</p>
								)}
							</div>
						) : (
							<p className="mt-3 text-sm text-muted-foreground">
								Simple editor, up to 2 templates, and 10 recipients
								per batch. Upgrade for the full toolkit.
							</p>
						)}

						<div className="mt-5 flex flex-wrap gap-2">
							{status.is_pro ? (
								<Button
									variant="outline"
									className="gap-2"
									onClick={handleManageBilling}
									disabled={isOpeningPortal}
								>
									<CreditCard className="h-4 w-4" />
									{isOpeningPortal ? "Opening..." : "Manage Billing"}
									<ExternalLink className="h-3.5 w-3.5" />
								</Button>
							) : (
								<Button asChild>
									<Link to="/pricing">Upgrade to Pro</Link>
								</Button>
							)}
						</div>
					</div>

					{/* Credits card */}
					<div className="border border-border bg-card p-6">
						<h3 className="font-playfair text-xl italic text-foreground">
							Certificate Credits
						</h3>
						<p className="mt-3 font-playfair text-3xl font-bold italic text-foreground">
							{status.credit_balance}
						</p>
						<p className="mt-1 text-xs text-muted-foreground">
							Credits raise your batch-generation cap beyond the free
							limit, one credit per certificate, and never expire.
						</p>
						<Button variant="outline" className="mt-5" asChild>
							<Link to="/pricing">Buy More Credits</Link>
						</Button>
					</div>
				</div>
			) : null}
		</div>
	);
};

export default BillingPage;
