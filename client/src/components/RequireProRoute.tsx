import { useAuthContext } from "@/hooks/useAuthContext";
import { fetchBillingStatus } from "@/services/billingApi";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

interface RequireProRouteProps {
	children: React.ReactNode;
}

/**
 * Assumes it's nested inside ProtectedRoute (the user is already known to be
 * signed in) and additionally requires an active Pro subscription. Shown
 * for e.g. the Advanced editor, which is a Pro-only feature.
 */
const RequireProRoute = ({ children }: RequireProRouteProps) => {
	const { BASE_URL } = useAuthContext();
	const [isPro, setIsPro] = useState<boolean | null>(null);

	useEffect(() => {
		let cancelled = false;
		fetchBillingStatus(BASE_URL)
			.then((status) => {
				if (!cancelled) setIsPro(status.is_pro);
			})
			.catch(() => {
				if (!cancelled) setIsPro(false);
			});
		return () => {
			cancelled = true;
		};
	}, [BASE_URL]);

	if (isPro === null) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-background">
				<div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
			</div>
		);
	}

	if (!isPro) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-background px-6">
				<div className="text-center">
					<p className="font-playfair text-[6rem] font-bold italic leading-none text-foreground/10 sm:text-[8rem]">
						Pro
					</p>
					<h1 className="-mt-6 font-playfair text-3xl italic text-foreground sm:-mt-8 sm:text-4xl">
						The Advanced editor is a Pro feature.
					</h1>
					<p className="font-hand mt-3 text-2xl text-secondary">
						Multiple fields, unlimited templates, and more
					</p>
					<div className="mt-6 flex flex-wrap items-center justify-center gap-3">
						<Link
							to="/pricing"
							className="inline-block border-2 border-foreground bg-primary px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-primary-foreground shadow-[3px_3px_0_hsl(var(--foreground))] transition-all hover:-translate-y-0.5"
						>
							See Pricing
						</Link>
						<Link
							to="/editor"
							className="inline-block border-2 border-foreground bg-background px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-foreground transition-all hover:-translate-y-0.5"
						>
							Use Simple Editor
						</Link>
					</div>
				</div>
			</div>
		);
	}

	return <>{children}</>;
};

export default RequireProRoute;
