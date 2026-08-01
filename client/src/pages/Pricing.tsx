import GencMark from "@/components/GencMark";
import { Button } from "@/components/ui/button";
import { useAuthContext } from "@/hooks/useAuthContext";
import { cn } from "@/lib/utils";
import {
	fetchBillingStatus,
	startCreditCheckout,
	startSubscriptionCheckout,
} from "@/services/billingApi";
import { motion } from "framer-motion";
import { Check, Minus } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

const FREE_FEATURES = [
	"Simple editor (1 field per certificate)",
	"Up to 2 templates",
	"2 publishable links (25 generations each)",
	"Up to 2 collections",
	"10 recipients per batch",
	"3 redownloads per certificate",
	"Basic usage stats",
];

const PRO_FEATURES = [
	"Advanced editor (multiple fields per certificate)",
	"Unlimited templates",
	"Unlimited collections",
	"Unlimited batch generation",
	"Recipient email verification (access control)",
	"Unlimited recipient redownloads",
	"Full analytics dashboard",
];

const COMPARISON_ROWS: {
	feature: string;
	free: string;
	pro: string;
}[] = [
	{
		feature: "Self-serve public links",
		free: "2 links, 25 generations each",
		pro: "Unlimited",
	},
	{ feature: "Templates", free: "2 active", pro: "Unlimited" },
	{ feature: "Collections", free: "2 active", pro: "Unlimited" },
	{ feature: "Editor", free: "Simple (1 field)", pro: "Advanced (multi-field)" },
	{ feature: "Batch generation", free: "10 recipients / batch", pro: "Unlimited" },
	{ feature: "Recipient email verification", free: "Not included", pro: "Included" },
	{ feature: "Certificate redownloads", free: "3 per certificate", pro: "Unlimited" },
	{ feature: "Analytics", free: "Basic count only", pro: "Full dashboard" },
];

const Pricing = () => {
	const navigate = useNavigate();
	const { isAuthenticated, isPro, loading, BASE_URL } = useAuthContext();
	const [pendingPlan, setPendingPlan] = useState<
		"month" | "year" | "credits" | null
	>(null);
	const [billingInterval, setBillingInterval] = useState<
		"" | "month" | "year"
	>("");

	useEffect(() => {
		if (!isAuthenticated) {
			setBillingInterval("");
			return;
		}
		fetchBillingStatus(BASE_URL)
			.then((status) => setBillingInterval(status.interval))
			.catch(() => setBillingInterval(""));
	}, [isAuthenticated, BASE_URL]);

	const isFreeCurrent = isAuthenticated && !isPro;
	const isMonthlyCurrent =
		isAuthenticated && isPro && billingInterval === "month";
	const isAnnualCurrent =
		isAuthenticated && isPro && billingInterval === "year";

	const requireAuth = () => {
		if (loading) return false;
		if (!isAuthenticated) {
			navigate("/login", { state: { from: { pathname: "/pricing" } } });
			return false;
		}
		return true;
	};

	const handleSubscribe = async (interval: "month" | "year") => {
		if (!requireAuth()) return;
		setPendingPlan(interval);
		try {
			const url = await startSubscriptionCheckout(BASE_URL, interval);
			window.location.href = url;
		} catch {
			toast.error("Couldn't start checkout. Please try again.");
			setPendingPlan(null);
		}
	};

	const handleBuyCredits = async () => {
		if (!requireAuth()) return;
		setPendingPlan("credits");
		try {
			const url = await startCreditCheckout(BASE_URL);
			window.location.href = url;
		} catch {
			toast.error("Couldn't start checkout. Please try again.");
			setPendingPlan(null);
		}
	};

	return (
		<div className="min-h-screen bg-background text-foreground">
			<header className="border-b-4 border-foreground">
				<div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-5 sm:px-8">
					<Link
						to="/"
						className="flex items-center gap-2 font-playfair text-2xl font-bold italic tracking-tight text-foreground"
					>
						<GencMark className="h-6 w-6 shrink-0 text-primary" />
						genC
					</Link>
					<Button variant="outline" size="sm" asChild>
						<Link to={isAuthenticated ? "/dashboard" : "/login"}>
							{isAuthenticated ? "Dashboard" : "Sign In"}
						</Link>
					</Button>
				</div>
			</header>

			<section className="mx-auto max-w-[1400px] px-5 py-16 text-center sm:px-8 sm:py-20">
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.4 }}
				>
					<h1 className="font-playfair text-4xl italic leading-[1.05] tracking-tight text-foreground sm:text-5xl">
						Simple pricing, no surprises.
					</h1>
					<p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
						Free forever for a single certificate now and then. Pro when
						you're issuing them for real.
					</p>
				</motion.div>

				<div className="mx-auto mt-14 grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
					{/* Free */}
					<div className="relative flex flex-col border border-border bg-card p-6 text-left">
						{isFreeCurrent && (
							<span className="absolute -top-3 left-6 border border-foreground bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary-foreground">
								Your Plan
							</span>
						)}
						<h3 className="font-playfair text-xl italic text-foreground">
							Free
						</h3>
						<p className="mt-1 text-3xl font-bold text-foreground">
							$0
							<span className="text-sm font-normal text-muted-foreground">
								/forever
							</span>
						</p>
						<ul className="mt-5 flex-1 space-y-2.5">
							{FREE_FEATURES.map((feature) => (
								<li
									key={feature}
									className="flex items-start gap-2 text-xs text-muted-foreground"
								>
									<Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
									{feature}
								</li>
							))}
						</ul>
						{isFreeCurrent ? (
							<div className="mt-6 border-2 border-foreground bg-muted px-5 py-2.5 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">
								Current Plan
							</div>
						) : isPro ? (
							<p className="mt-6 text-center text-xs text-muted-foreground">
								Included in your Pro plan
							</p>
						) : (
							<Button variant="outline" className="mt-6" asChild>
								<Link to="/signup">Get Started Free</Link>
							</Button>
						)}
					</div>

					{/* Monthly */}
					<div className="relative flex flex-col border border-border bg-card p-6 text-left">
						{isMonthlyCurrent && (
							<span className="absolute -top-3 left-6 border border-foreground bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary-foreground">
								Your Plan
							</span>
						)}
						<h3 className="font-playfair text-xl italic text-foreground">
							Pro Monthly
						</h3>
						<p className="mt-1 text-3xl font-bold text-foreground">
							$4.99
							<span className="text-sm font-normal text-muted-foreground">
								/month
							</span>
						</p>
						<ul className="mt-5 flex-1 space-y-2.5">
							{PRO_FEATURES.map((feature) => (
								<li
									key={feature}
									className="flex items-start gap-2 text-xs text-muted-foreground"
								>
									<Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
									{feature}
								</li>
							))}
						</ul>
						{isMonthlyCurrent ? (
							<div className="mt-6 border-2 border-foreground bg-muted px-5 py-2.5 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">
								Current Plan
							</div>
						) : (
							<Button
								className="mt-6"
								onClick={() => handleSubscribe("month")}
								disabled={pendingPlan !== null}
							>
								{pendingPlan === "month" ? "Redirecting..." : "Subscribe Monthly"}
							</Button>
						)}
					</div>

					{/* Annual (highlighted) */}
					<div className="relative flex flex-col border-2 border-primary bg-card p-6 text-left shadow-[4px_4px_0_hsl(var(--primary))]">
						<span className="absolute -top-3 left-6 border border-foreground bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary-foreground">
							{isAnnualCurrent ? "Your Plan" : "2 months free"}
						</span>
						<h3 className="font-playfair text-xl italic text-foreground">
							Pro Annual
						</h3>
						<p className="mt-1 text-3xl font-bold text-foreground">
							$49.99
							<span className="text-sm font-normal text-muted-foreground">
								/year
							</span>
						</p>
						<p className="text-xs text-muted-foreground">
							vs. $59.88 billed monthly
						</p>
						<ul className="mt-5 flex-1 space-y-2.5">
							{PRO_FEATURES.map((feature) => (
								<li
									key={feature}
									className="flex items-start gap-2 text-xs text-muted-foreground"
								>
									<Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
									{feature}
								</li>
							))}
						</ul>
						{isAnnualCurrent ? (
							<div className="mt-6 border-2 border-foreground bg-muted px-5 py-2.5 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">
								Current Plan
							</div>
						) : (
							<Button
								className="mt-6"
								onClick={() => handleSubscribe("year")}
								disabled={pendingPlan !== null}
							>
								{pendingPlan === "year" ? "Redirecting..." : "Subscribe Annually"}
							</Button>
						)}
					</div>

					{/* Credit pack */}
					<div className="flex flex-col border border-border bg-card p-6 text-left">
						<h3 className="font-playfair text-xl italic text-foreground">
							Credit Pack
						</h3>
						<p className="mt-1 text-3xl font-bold text-foreground">
							$19.99
							<span className="text-sm font-normal text-muted-foreground">
								{" "}
								one-time
							</span>
						</p>
						<p className="text-xs text-muted-foreground">
							500 certificate credits, never expire
						</p>
						<ul className="mt-5 flex-1 space-y-2.5">
							<li className="flex items-start gap-2 text-xs text-muted-foreground">
								<Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
								Use for one big batch, whenever you need it
							</li>
							<li className="flex items-start gap-2 text-xs text-muted-foreground">
								<Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
								No subscription required
							</li>
							<li className="flex items-start gap-2 text-xs text-muted-foreground">
								<Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
								Stacks on top of the free tier's batch cap
							</li>
						</ul>
						<Button
							variant="outline"
							className={cn("mt-6")}
							onClick={handleBuyCredits}
							disabled={pendingPlan !== null}
						>
							{pendingPlan === "credits"
								? "Redirecting..."
								: "Buy 500 Credits"}
						</Button>
					</div>
				</div>

				<p className="mt-10 text-xs text-muted-foreground">
					Free accounts keep up to {""}
					<Link to="/editor" className="underline underline-offset-2">
						2 publishable links
					</Link>
					{" "}(25 generations each) and 10 recipients per batch.
				</p>

				{/* Compare plans */}
				<div className="mx-auto mt-20 max-w-3xl text-left">
					<h2 className="text-center font-playfair text-2xl italic text-foreground sm:text-3xl">
						Compare plans
					</h2>
					<div className="mt-8 overflow-x-auto border border-border">
						<table className="w-full min-w-[480px] border-collapse text-sm">
							<thead>
								<tr className="border-b-2 border-foreground">
									<th className="p-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
										Feature
									</th>
									<th className="p-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
										Free
									</th>
									<th className="p-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-primary">
										Pro
									</th>
								</tr>
							</thead>
							<tbody>
								{COMPARISON_ROWS.map((row, i) => (
									<tr
										key={row.feature}
										className={cn(
											i !== COMPARISON_ROWS.length - 1 &&
												"border-b border-dashed border-border",
										)}
									>
										<td className="p-4 text-foreground">{row.feature}</td>
										<td className="p-4 text-muted-foreground">
											{row.free === "Not included" ? (
												<Minus className="h-4 w-4 text-muted-foreground/60" />
											) : (
												row.free
											)}
										</td>
										<td className="p-4 font-medium text-foreground">
											<span className="flex items-center gap-1.5">
												<Check className="h-3.5 w-3.5 shrink-0 text-primary" />
												{row.pro}
											</span>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			</section>
		</div>
	);
};

export default Pricing;
