import { cn } from "@/lib/utils";
import { NavLink, Outlet } from "react-router-dom";

const tabs = [
	{ label: "Account", to: "/dashboard/settings", end: true },
	{ label: "Billing", to: "/dashboard/settings/billing", end: false },
];

const SettingsPage = () => {
	return (
		<div className="space-y-10 pb-10">
			{/* Byline header */}
			<div className="relative">
				<span
					aria-hidden
					className="pointer-events-none absolute -left-2 -top-12 select-none font-playfair text-[7rem] font-bold italic leading-none text-foreground/[0.04] sm:text-[9rem]"
				>
					05
				</span>
				<div className="relative border-b-2 border-foreground pb-4">
					<h2 className="mt-1 font-playfair text-3xl italic text-foreground sm:text-4xl">
						Your Dossier
					</h2>
					<p className="mt-1 text-sm text-muted-foreground">
						Profile details, account security, and billing.
					</p>
				</div>
			</div>

			{/* Tab nav */}
			<div className="flex gap-6 border-b border-border">
				{tabs.map((tab) => (
					<NavLink
						key={tab.to}
						to={tab.to}
						end={tab.end}
						className={({ isActive }) =>
							cn(
								"-mb-px border-b-2 pb-3 text-xs font-semibold uppercase tracking-[0.2em] transition-colors",
								isActive
									? "border-primary text-primary"
									: "border-transparent text-muted-foreground hover:text-foreground",
							)
						}
					>
						{tab.label}
					</NavLink>
				))}
			</div>

			<Outlet />
		</div>
	);
};

export default SettingsPage;
