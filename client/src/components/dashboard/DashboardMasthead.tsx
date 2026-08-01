import ThemeToggler from "@/components/dashboard/ThemeToggler";
import GencMark from "@/components/GencMark";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthContext } from "@/hooks/useAuthContext";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, LogOut, Settings, Sparkles } from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

const sections = [
	{ no: "01", title: "Overview", url: "/dashboard", exact: true },
	{ no: "02", title: "Templates", url: "/dashboard/templates" },
	{ no: "03", title: "Signatures", url: "/dashboard/signatures" },
	{ no: "04", title: "Analytics", url: "/dashboard/analytics" },
	{ no: "05", title: "Collections", url: "/dashboard/collections" },
];

const today = new Date().toLocaleDateString(undefined, {
	weekday: "long",
	year: "numeric",
	month: "long",
	day: "numeric",
});

const DashboardMasthead = () => {
	const location = useLocation();
	const navigate = useNavigate();
	const { user, userName, isPro, logout } = useAuthContext();
	const [collapsed, setCollapsed] = useState(
		() => localStorage.getItem("dashboard-header-collapsed") === "true",
	);
	const toggleCollapsed = () => {
		setCollapsed((prev) => {
			const next = !prev;
			localStorage.setItem("dashboard-header-collapsed", String(next));
			return next;
		});
	};

	const initials =
		userName
			.trim()
			.split(/\s+/)
			.map((n) => n[0])
			.slice(0, 2)
			.join("")
			.toUpperCase() || "?";

	const handleLogout = () => {
		localStorage.removeItem("auth_token");
		logout();
		navigate("/login");
	};

	const accountMenu = (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button className="flex items-center gap-2.5 self-start rounded-full py-1 pl-1 pr-3 transition-colors hover:bg-muted sm:self-auto">
					<Avatar
						className={cn(
							"h-8 w-8 border-2",
							isPro ? "border-primary" : "border-foreground",
						)}
					>
						<AvatarFallback className="bg-secondary text-xs font-semibold text-secondary-foreground">
							{initials}
						</AvatarFallback>
					</Avatar>
					<span className="text-xs uppercase tracking-[0.2em] text-foreground">
						{userName || "Account"}
					</span>
					{isPro && (
						<span className="rounded-full border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-primary">
							Pro
						</span>
					)}
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-56">
				<div className="px-2 py-1.5">
					<div className="flex items-center gap-1.5">
						<p className="truncate text-sm font-medium text-foreground">
							{userName || "Account"}
						</p>
						{isPro && (
							<span className="shrink-0 rounded-full border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-primary">
								Pro
							</span>
						)}
					</div>
					<p className="truncate text-xs text-muted-foreground">
						{user?.email ?? ""}
					</p>
				</div>
				<DropdownMenuSeparator />
				{!isPro && (
					<>
						<DropdownMenuItem
							className="font-medium text-primary focus:text-primary"
							onClick={() => navigate("/pricing")}
						>
							<Sparkles className="mr-2 h-4 w-4" />
							Upgrade to Pro
						</DropdownMenuItem>
						<DropdownMenuSeparator />
					</>
				)}
				<DropdownMenuItem onClick={() => navigate("/dashboard/settings")}>
					<Settings className="mr-2 h-4 w-4" />
					Settings
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					className="text-destructive focus:text-destructive"
					onClick={handleLogout}
				>
					<LogOut className="mr-2 h-4 w-4" />
					Log out
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);

	return (
		<header className="relative border-b-4 border-foreground bg-background">
			<AnimatePresence initial={false}>
				{!collapsed && (
					<motion.div
						key="masthead-block"
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: "auto", opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.22, ease: "easeInOut" }}
						className="overflow-hidden"
					>
						{/* Nameplate */}
						<div className="mx-auto flex max-w-[1400px] flex-col gap-3 px-5 pb-4 pt-1 sm:flex-row sm:items-end sm:justify-between sm:px-8">
							<Link to="/" className="group flex items-center gap-3">
								<GencMark className="h-10 w-10 shrink-0 text-primary sm:h-12 sm:w-12" />
								<h1 className="font-playfair text-5xl font-bold italic tracking-tight text-foreground sm:text-6xl">
									genC
								</h1>
								<span className="hidden text-xs uppercase tracking-[0.3em] text-muted-foreground sm:inline">
									The Certificate Desk
								</span>
							</Link>

							{accountMenu}
						</div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Table of contents nav */}
			<nav className="border-t border-border bg-muted/40">
				<div className="mx-auto flex max-w-[1400px] items-center gap-5 overflow-x-auto px-5 py-2.5 sm:gap-7 sm:px-8">
					{collapsed && (
						<>
							<Link
								to="/"
								className="shrink-0 font-playfair text-lg font-bold italic text-foreground"
							>
								genC
							</Link>
							<span className="hidden h-3 w-px bg-border sm:block" aria-hidden />
						</>
					)}
					{sections.map((section, i) => {
						const isActive = section.exact
							? location.pathname === section.url
							: location.pathname.startsWith(section.url);
						return (
							<div key={section.url} className="flex shrink-0 items-center gap-5 sm:gap-7">
								{i > 0 && (
									<span className="hidden h-3 w-px bg-border sm:block" aria-hidden />
								)}
								<Link
									to={section.url}
									className={cn(
										"group flex shrink-0 items-baseline gap-1.5 whitespace-nowrap text-xs uppercase tracking-[0.15em] transition-colors",
										isActive
											? "text-primary"
											: "text-muted-foreground hover:text-foreground",
									)}
								>
									<span className="font-playfair text-[11px] italic">
										{section.no}
									</span>
									<span
										className={cn(
											"pb-0.5",
											isActive
												? "border-b-2 border-primary font-semibold"
												: "border-b-2 border-transparent group-hover:border-border",
										)}
									>
										{section.title}
									</span>
								</Link>
							</div>
						);
					})}
					<div className="ml-auto flex shrink-0 items-center gap-3 pl-2">
						<ThemeToggler />
						{collapsed && accountMenu}
					</div>
				</div>
			</nav>

			<button
				onClick={toggleCollapsed}
				aria-label={collapsed ? "Expand header" : "Collapse header"}
				title={collapsed ? "Expand header" : "Collapse header"}
				className="absolute -bottom-3 left-1/2 flex h-6 w-9 -translate-x-1/2 items-center justify-center rounded-full border-2 border-foreground bg-background text-foreground shadow-[2px_2px_0_hsl(var(--foreground))] transition-transform hover:-translate-y-0.5"
			>
				<ChevronDown
					className={cn(
						"h-3.5 w-3.5 transition-transform",
						collapsed && "rotate-180",
					)}
				/>
			</button>
		</header>
	);
};

export default DashboardMasthead;
