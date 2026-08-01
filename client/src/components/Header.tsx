import GencMark from "@/components/GencMark";
import TourButton from "@/components/TourButton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useAuthContext } from "@/hooks/useAuthContext";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import {
	ChevronDown,
	Laptop,
	LayoutDashboard,
	LogOut,
	Moon,
	Settings,
	Sparkles,
	Sun,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

interface HeaderProps {
	onTourClick: () => void;
}

const navItems = [
	{ no: "01", title: "Editor", url: "/editor" },
	{ no: "02", title: "Marketplace", url: "/marketplace" },
];

const today = new Date().toLocaleDateString(undefined, {
	weekday: "long",
	year: "numeric",
	month: "long",
	day: "numeric",
});

const Header = ({ onTourClick }: HeaderProps) => {
	const { theme, setTheme } = useTheme();
	const navigate = useNavigate();
	const { user, userName, isAuthenticated, isPro, logout } = useAuthContext();
	const [collapsed, setCollapsed] = useState(
		() => localStorage.getItem("header-collapsed") === "true",
	);
	const toggleCollapsed = () => {
		setCollapsed((prev) => {
			const next = !prev;
			localStorage.setItem("header-collapsed", String(next));
			return next;
		});
	};
	const selectedTheme = theme ?? "system";
	const themeOptions = ["system", "light", "dark"] as const;
	const selectedThemeIndex = Math.max(
		themeOptions.indexOf(selectedTheme as (typeof themeOptions)[number]),
		0,
	);

	const location = useLocation();

	const handleLogout = async () => {
		localStorage.removeItem("auth_token");
		await logout();
		navigate("/login");
	};

	const controls = (
		<>
			{isAuthenticated && (
				<button
					onClick={() => navigate("/dashboard")}
					className="flex items-center gap-1.5 border-2 border-foreground bg-secondary px-3.5 py-1.5 text-xs font-bold uppercase tracking-widest text-secondary-foreground shadow-[3px_3px_0_hsl(var(--foreground))] transition-all hover:-translate-y-0.5"
				>
					<LayoutDashboard className="h-3.5 w-3.5" />
					Dashboard
				</button>
			)}

			<TourButton onClick={onTourClick} />

			<ToggleGroup
				type="single"
				value={selectedTheme}
				onValueChange={(value) => {
					if (value) setTheme(value);
				}}
				variant="default"
				size="sm"
				className="relative rounded-full border border-border bg-background/80 p-1"
			>
				<motion.span
					aria-hidden="true"
					animate={{ x: `${selectedThemeIndex * 100}%` }}
					transition={{
						type: "spring",
						stiffness: 450,
						damping: 35,
					}}
					className="absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/3)] rounded-full bg-foreground"
				/>
				<ToggleGroupItem
					value="system"
					aria-label="Use system theme"
					className="relative z-10 rounded-full px-2.5 text-muted-foreground data-[state=on]:bg-transparent data-[state=on]:text-background"
				>
					<Laptop className="h-4 w-4" />
				</ToggleGroupItem>
				<ToggleGroupItem
					value="light"
					aria-label="Use light theme"
					className="relative z-10 rounded-full px-2.5 text-muted-foreground data-[state=on]:bg-transparent data-[state=on]:text-background"
				>
					<Sun className="h-4 w-4" />
				</ToggleGroupItem>
				<ToggleGroupItem
					value="dark"
					aria-label="Use dark theme"
					className="relative z-10 rounded-full px-2.5 text-muted-foreground data-[state=on]:bg-transparent data-[state=on]:text-background"
				>
					<Moon className="h-4 w-4" />
				</ToggleGroupItem>
			</ToggleGroup>

			{isAuthenticated && (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<button className="rounded-full transition-opacity hover:opacity-80">
							<Avatar
								className={cn(
									"h-9 w-9 border-2",
									isPro ? "border-primary" : "border-foreground",
								)}
							>
								<AvatarFallback className="bg-secondary text-xs font-semibold text-secondary-foreground">
									{userName
										.split(" ")
										.map((n) => n[0])
										.join("")
										.toUpperCase()}
								</AvatarFallback>
							</Avatar>
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
			)}
		</>
	);

	return (
		<motion.header
			initial={{ opacity: 0, y: -20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.4 }}
			className="relative flex-shrink-0 border-b-4 border-foreground bg-background"
		>
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
								<h1 className="font-playfair text-5xl font-bold italic tracking-tight text-foreground transition-colors group-hover:text-primary sm:text-6xl">
									genC
								</h1>
								<span className="hidden text-xs uppercase tracking-[0.3em] text-muted-foreground sm:inline">
									Certificates, Designed
								</span>
							</Link>

							<div className="flex items-center gap-3">{controls}</div>
						</div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Table of contents nav */}
			<nav className="border-t border-border bg-muted/40">
				<div className="mx-auto flex max-w-[1400px] items-center gap-5 overflow-x-auto px-5 py-2 sm:gap-7 sm:px-8">
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
					{navItems.map((item, i) => {
						const isActive = location.pathname === item.url;
						return (
							<div key={item.url} className="flex shrink-0 items-center gap-5 sm:gap-7">
								{i > 0 && (
									<span className="hidden h-3 w-px bg-border sm:block" aria-hidden />
								)}
								<Link
									to={item.url}
									className={cn(
										"group flex shrink-0 items-baseline gap-1.5 whitespace-nowrap text-xs uppercase tracking-[0.15em] transition-colors",
										isActive
											? "text-primary"
											: "text-muted-foreground hover:text-foreground",
									)}
								>
									<span className="font-playfair text-[11px] italic">
										{item.no}
									</span>
									<span
										className={cn(
											"pb-0.5",
											isActive
												? "border-b-2 border-primary font-semibold"
												: "border-b-2 border-transparent group-hover:border-border",
										)}
									>
										{item.title}
									</span>
								</Link>
							</div>
						);
					})}

					{collapsed && (
						<div className="ml-auto flex shrink-0 items-center gap-3 pl-2">
							{controls}
						</div>
					)}
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
		</motion.header>
	);
};

export default Header;
