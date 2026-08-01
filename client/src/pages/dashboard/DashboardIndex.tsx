import { Skeleton } from "@/components/ui/skeleton";
import { useAuthContext } from "@/hooks/useAuthContext";
import { openTemplateInEditor } from "@/lib/editorUtils";
import { cn } from "@/lib/utils";
import {
	fetchCollections,
	fetchDashboardStats,
	fetchTemplates,
} from "@/services/dashboardApi";
import type { Template } from "@/types/Template";
import { formatDistanceToNow } from "date-fns";
import {
	FolderOpen,
	LayoutGrid,
	Send,
	Sparkles,
	Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const getGreeting = () => {
	const hour = new Date().getHours();
	if (hour < 5) return "Working late";
	if (hour < 12) return "Good morning";
	if (hour < 18) return "Good afternoon";
	return "Good evening";
};

interface Stats {
	templates: number;
	collections: number;
	trashed: number;
	generated: number;
}

const STAMP_ROTATIONS = ["-rotate-6", "rotate-3", "-rotate-3"];

const DashboardIndex = () => {
	const navigate = useNavigate();
	const { BASE_URL, userName, isPro } = useAuthContext();
	const [stats, setStats] = useState<Stats | null>(null);
	const [recentTemplates, setRecentTemplates] = useState<Template[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const firstName = userName.split(" ")[0];

	useEffect(() => {
		let cancelled = false;

		const load = async () => {
			setIsLoading(true);
			try {
				const [active, trashed, collections, recent, usage] =
					await Promise.all([
						fetchTemplates(BASE_URL, { state: "active", page: 1, pageSize: 1 }),
						fetchTemplates(BASE_URL, { state: "deleted", page: 1, pageSize: 1 }),
						fetchCollections(BASE_URL, { page: 1, pageSize: 1 }),
						fetchTemplates(BASE_URL, { state: "active", page: 1, pageSize: 8 }),
						fetchDashboardStats(BASE_URL),
					]);

				if (cancelled) return;

				setStats({
					templates: active.pagination.total_count,
					collections: collections.pagination.total_count,
					trashed: trashed.pagination.total_count,
					generated: usage.total_generated,
				});
				setRecentTemplates(recent.templates);
			} finally {
				if (!cancelled) setIsLoading(false);
			}
		};

		void load();
		return () => {
			cancelled = true;
		};
	}, [BASE_URL]);

	const stamps = [
		{
			label: "Templates",
			value: stats?.templates,
			icon: LayoutGrid,
			onClick: () => navigate("/dashboard/templates"),
		},
		{
			label: "Generated",
			value: stats?.generated,
			icon: Send,
			onClick: () => navigate("/dashboard/templates"),
		},
		{
			label: "Collections",
			value: stats?.collections,
			icon: FolderOpen,
			onClick: () => navigate("/dashboard/collections"),
		},
		{
			label: "Trashed",
			value: stats?.trashed,
			icon: Trash2,
			onClick: () => navigate("/dashboard/trash"),
		},
	];

	return (
		<div className="space-y-24 pb-16">
			{/* Cover story */}
			<section className="grid grid-cols-1 gap-12 lg:grid-cols-12">
				<div className="relative lg:col-span-7">
					<span
						aria-hidden
						className="pointer-events-none absolute -left-4 -top-14 select-none font-playfair text-[10rem] italic leading-none text-primary/10 sm:text-[13rem]"
					>
						&ldquo;
					</span>
					<p className="relative text-xs font-semibold uppercase tracking-[0.3em] text-secondary">
						{getGreeting()}{firstName ? `, ${firstName}` : ""}
					</p>
					<h2 className="relative mt-3 font-playfair text-4xl italic leading-[1.05] tracking-tight text-foreground sm:text-6xl">
						Every certificate
						<br />
						starts with a{" "}
						<span className="text-primary">blank page</span>.
					</h2>
					<p className="relative mt-5 max-w-md text-sm leading-relaxed text-muted-foreground">
						This is your workspace where templates are designed,
						collected, and sent out into the world. Pick up where
						you left off, or start something new.
					</p>

					<div className="relative mt-7 flex flex-wrap items-center gap-x-8 gap-y-3">
						<button
							onClick={() => navigate("/advanced")}
							className="group text-sm font-semibold text-foreground"
						>
							<span className="border-b-2 border-primary pb-0.5 transition-colors group-hover:text-primary">
								Start a new template
							</span>{" "}
							<span className="transition-transform group-hover:translate-x-1 inline-block">
								→
							</span>
						</button>
						<button
							onClick={() => navigate("/marketplace")}
							className="group text-sm font-semibold text-muted-foreground"
						>
							<span className="border-b-2 border-transparent pb-0.5 transition-colors group-hover:border-border group-hover:text-foreground">
								Browse the marketplace
							</span>{" "}
							<span className="transition-transform group-hover:translate-x-1 inline-block">
								→
							</span>
						</button>
					</div>
				</div>

				{/* Stat stamps */}
				<div className="flex items-center justify-center gap-2 lg:col-span-5 lg:justify-end">
					{stamps.map((stamp, i) => (
						<button
							key={stamp.label}
							onClick={stamp.onClick}
							className={cn(
								"group relative flex h-32 w-32 shrink-0 flex-col items-center justify-center gap-1 rounded-full border-2 border-dashed border-foreground/70 bg-card text-center shadow-[3px_3px_0_hsl(var(--foreground)/0.15)] transition-transform hover:rotate-0 hover:scale-105 sm:h-36 sm:w-36",
								STAMP_ROTATIONS[i % STAMP_ROTATIONS.length],
								i > 0 && "-ml-6",
							)}
							style={{ zIndex: stamps.length - i }}
						>
							<stamp.icon className="h-4 w-4 text-secondary" />
							{isLoading ? (
								<Skeleton className="h-7 w-10" />
							) : (
								<span className="font-playfair text-3xl font-bold italic text-foreground">
									{stamp.value ?? 0}
								</span>
							)}
							<span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
								{stamp.label}
							</span>
						</button>
					))}
				</div>
			</section>

			{/* Upgrade banner */}
			{!isPro && (
				<section className="flex flex-col items-start gap-4 border-2 border-foreground bg-primary/5 p-6 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex items-start gap-3">
						<Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
						<div>
							<p className="font-playfair text-lg italic text-foreground">
								You're on the Free plan
							</p>
							<p className="mt-0.5 text-sm text-muted-foreground">
								Unlock the advanced editor, unlimited templates and
								batches, recipient verification, and full analytics.
							</p>
						</div>
					</div>
					<Link
						to="/pricing"
						className="flex shrink-0 items-center gap-2 border-2 border-foreground bg-primary px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-primary-foreground shadow-[3px_3px_0_hsl(var(--foreground))] transition-all hover:-translate-y-0.5"
					>
						Upgrade to Pro
					</Link>
				</section>
			)}

			{/* Recent work collage */}
			<section className="relative">
				<span
					aria-hidden
					className="pointer-events-none absolute -left-3 -top-16 select-none font-playfair text-[9rem] font-bold italic leading-none text-foreground/[0.04] sm:text-[11rem]"
				>
					02
				</span>
				<div className="relative flex items-end justify-between border-b-2 border-foreground pb-3">
					<h3 className="font-playfair text-2xl italic text-foreground sm:text-3xl">
						Recent work
					</h3>
					<span className="font-hand hidden text-xl text-secondary sm:inline">
						double-click to open →
					</span>
				</div>

				{isLoading ? (
					<div className="mt-10 flex gap-6 overflow-hidden">
						{Array.from({ length: 4 }).map((_, i) => (
							<Skeleton
								key={i}
								className="h-52 w-44 shrink-0 rounded-sm"
							/>
						))}
					</div>
				) : recentTemplates.length === 0 ? (
					<div className="mt-10 flex flex-col items-center gap-2 border-2 border-dashed border-border py-16 text-center">
						<p className="font-playfair text-xl italic text-foreground">
							The page is still blank
						</p>
						<button
							onClick={() => navigate("/advanced")}
							className="mt-2 text-sm font-semibold text-primary underline underline-offset-4"
						>
							Create your first template
						</button>
					</div>
				) : (
					<div className="mt-12 flex flex-wrap items-start gap-x-2 gap-y-10 sm:gap-x-4">
						{recentTemplates.map((t, i) => (
							<div
								key={t.id}
								onDoubleClick={() => openTemplateInEditor(navigate, t)}
								role="button"
								tabIndex={0}
								className={cn(
									"group w-40 shrink-0 cursor-pointer border border-border bg-card p-2.5 pb-4 shadow-[3px_3px_0_hsl(var(--foreground)/0.12)] transition-all hover:z-10 hover:-translate-y-1 hover:rotate-0 hover:shadow-[5px_5px_0_hsl(var(--foreground)/0.18)] sm:w-48",
									i % 3 === 0
										? "-rotate-2"
										: i % 3 === 1
											? "rotate-1 sm:mt-6"
											: "-rotate-1 sm:-mt-3",
								)}
							>
								<div className="aspect-[4/3] w-full overflow-hidden bg-muted">
									<img
										src={t.url}
										alt={t.name ?? "Template"}
										className="h-full w-full object-cover"
									/>
								</div>
								<p className="font-hand mt-2 truncate text-center text-lg text-foreground">
									{t.name || "Untitled"}
								</p>
								<p className="truncate text-center text-[10px] uppercase tracking-wider text-muted-foreground">
									{formatDistanceToNow(new Date(t.updated_at), {
										addSuffix: true,
									})}
								</p>
							</div>
						))}
					</div>
				)}
			</section>
		</div>
	);
};

export default DashboardIndex;
