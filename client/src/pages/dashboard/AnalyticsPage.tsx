import ActivityHeatmap from "@/components/dashboard/ActivityHeatmap";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useAuthContext } from "@/hooks/useAuthContext";
import { extractUpgradeError } from "@/lib/billingErrors";
import { fetchAnalytics } from "@/services/dashboardApi";
import type { Analytics } from "@/types/Analytics";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import {
	Download,
	FilePlus2,
	FolderOpen,
	Link2,
	Lock,
	Mail,
	Package,
	Send,
	Share2,
	ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
	Area,
	AreaChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

const AnalyticsPage = () => {
	const { BASE_URL } = useAuthContext();
	const [data, setData] = useState<Analytics | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [upgradeRequired, setUpgradeRequired] = useState(false);
	const [kindFilter, setKindFilter] = useState<
		"total" | "editor" | "self_serve" | "batch"
	>("total");
	const [timeframe, setTimeframe] = useState<7 | 30 | 90>(30);

	useEffect(() => {
		let cancelled = false;

		const load = async () => {
			setIsLoading(true);
			try {
				const result = await fetchAnalytics(BASE_URL);
				if (!cancelled) setData(result);
			} catch (err) {
				if (!cancelled && extractUpgradeError(err)) setUpgradeRequired(true);
			} finally {
				if (!cancelled) setIsLoading(false);
			}
		};

		void load();
		return () => {
			cancelled = true;
		};
	}, [BASE_URL]);

	const verificationRate =
		data && data.codes_requested > 0
			? Math.round((data.codes_verified / data.codes_requested) * 100)
			: null;

	const chartData =
		data?.daily.slice(-timeframe).map((d) => ({
			...d,
			label: format(parseISO(d.date), "MMM d"),
		})) ?? [];
	// The heatmap always shows a full year, independent of the 7/30/90-day
	// timeframe selector used by the generation trend above it.
	const activityHeatmapData = data?.activity_daily ?? [];
	// Aim for roughly 6-7 x-axis labels regardless of the selected window.
	const tickInterval = Math.max(0, Math.ceil(chartData.length / 7) - 1);

	const generationStatCards = [
		{
			label: "Total Generated",
			value: data?.total_generated ?? 0,
			icon: Send,
			caption: "certificates issued, all-time",
		},
		{
			label: "Editor",
			value: data?.by_kind.editor ?? 0,
			icon: Download,
			caption: "downloaded by you, in the editor",
		},
		{
			label: "Self-Serve",
			value: data?.by_kind.self_serve ?? 0,
			icon: Link2,
			caption: "via the public link",
		},
		{
			label: "Batch",
			value: data?.by_kind.batch ?? 0,
			icon: Package,
			caption: "via organizer bulk runs",
		},
		{
			label: "Recipients Invited",
			value: data?.recipients_invited ?? 0,
			icon: Mail,
			caption: `${data?.gated_templates ?? 0} gated template${
				(data?.gated_templates ?? 0) === 1 ? "" : "s"
			}`,
		},
		{
			label: "Verification Rate",
			value: verificationRate !== null ? `${verificationRate}%` : "—",
			icon: ShieldCheck,
			caption:
				data && data.codes_requested > 0
					? `${data.codes_verified}/${data.codes_requested} codes verified`
					: "no verification requests yet",
		},
	];

	const activityStatCards = [
		{
			label: "Templates Created",
			value: data?.templates_created_total ?? 0,
			icon: FilePlus2,
			caption: "templates you've ever uploaded",
		},
		{
			label: "Links Shared",
			value: data?.links_shared_total ?? 0,
			icon: Share2,
			caption: "times you've published a shareable link",
		},
		{
			label: "Templates Loaded",
			value: data?.templates_loaded_total ?? 0,
			icon: FolderOpen,
			caption: "times you've retrieved a template by id",
		},
	];

	const recentActivityCopy = (
		item: Analytics["recent_activity"][number],
	): string => {
		if (item.type === "generation") {
			const suffix =
				item.kind === "batch" ? " (batch)" : item.kind === "editor" ? " (editor)" : "";
			return `${item.count} certificate${item.count !== 1 ? "s" : ""} generated for "${item.template_name}"${suffix}`;
		}
		if (item.kind === "link_shared") {
			return item.label
				? `Shared a link for "${item.label}"`
				: "Shared a new link";
		}
		return item.label
			? `Loaded "${item.label}" by id`
			: "Loaded a template by id";
	};

	return (
		<div className="space-y-12">
			{/* Byline header */}
			<div className="relative">
				<span
					aria-hidden
					className="pointer-events-none absolute -left-2 -top-12 select-none font-playfair text-[7rem] font-bold italic leading-none text-foreground/[0.04] sm:text-[9rem]"
				>
					04
				</span>
				<div className="relative flex flex-wrap items-end justify-between gap-4 border-b-2 border-foreground pb-4">
					<div>
						<h2 className="mt-1 font-playfair text-3xl italic text-foreground sm:text-4xl">
							Analytics
						</h2>
						<p className="mt-1 text-sm text-muted-foreground">
							How your templates and certificates are actually being used.
						</p>
					</div>
					<Select
						value={String(timeframe)}
						onValueChange={(value) =>
							setTimeframe(Number(value) as typeof timeframe)
						}
					>
						<SelectTrigger className="h-8 w-[110px] text-xs">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="7">Last 7 days</SelectItem>
							<SelectItem value="30">Last 30 days</SelectItem>
							<SelectItem value="90">Last 90 days</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>

			{upgradeRequired ? (
				<div className="flex flex-col items-center gap-3 border border-dashed border-border bg-card px-6 py-16 text-center">
					<Lock className="h-6 w-6 text-muted-foreground" />
					<h3 className="font-playfair text-xl italic text-foreground">
						Full analytics is a Pro feature
					</h3>
					<p className="max-w-sm text-sm text-muted-foreground">
						Upgrade to Pro to see generation trends, verification rates,
						top templates, and recent activity.
					</p>
					<Link
						to="/pricing"
						className="mt-2 border border-foreground bg-foreground px-5 py-2 text-xs font-semibold uppercase tracking-wider text-background transition-opacity hover:opacity-90"
					>
						View Plans
					</Link>
				</div>
			) : (
				<>
			{/* ── Certificate generation ── */}
			<div className="space-y-6">
				<h3 className="text-xs font-semibold uppercase tracking-[0.25em] text-secondary">
					Certificate Generation
				</h3>

				<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
					{generationStatCards.map((card) => (
						<div key={card.label} className="border border-border bg-card p-4">
							<card.icon className="h-4 w-4 text-secondary" />
							{isLoading ? (
								<Skeleton className="mt-3 h-7 w-14" />
							) : (
								<p className="mt-3 font-playfair text-2xl font-bold italic text-foreground">
									{card.value}
								</p>
							)}
							<p className="mt-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
								{card.label}
							</p>
							<p className="mt-0.5 text-[11px] text-muted-foreground/80">
								{card.caption}
							</p>
						</div>
					))}
				</div>

				<div className="border border-border bg-card p-5">
					<div className="flex flex-wrap items-center justify-between gap-4">
						<h4 className="font-playfair text-lg italic text-foreground">
							Last {timeframe} days
						</h4>
						<ToggleGroup
							type="single"
							value={kindFilter}
							onValueChange={(value) => {
								if (value) setKindFilter(value as typeof kindFilter);
							}}
							variant="outline"
							size="sm"
						>
							<ToggleGroupItem value="total" className="text-xs">
								All
							</ToggleGroupItem>
							<ToggleGroupItem value="editor" className="text-xs">
								Editor
							</ToggleGroupItem>
							<ToggleGroupItem value="self_serve" className="text-xs">
								Self-Serve
							</ToggleGroupItem>
							<ToggleGroupItem value="batch" className="text-xs">
								Batch
							</ToggleGroupItem>
						</ToggleGroup>
					</div>
					{isLoading ? (
						<Skeleton className="mt-4 h-56 w-full" />
					) : (
						<div className="mt-4 h-56 w-full">
							<ResponsiveContainer width="100%" height="100%">
								<AreaChart
									data={chartData}
									margin={{ left: -20, right: 10, top: 10 }}
								>
									<defs>
										<linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
											<stop
												offset="0%"
												stopColor="hsl(var(--primary))"
												stopOpacity={0.35}
											/>
											<stop
												offset="100%"
												stopColor="hsl(var(--primary))"
												stopOpacity={0}
											/>
										</linearGradient>
									</defs>
									<CartesianGrid
										strokeDasharray="3 3"
										stroke="hsl(var(--border))"
										vertical={false}
									/>
									<XAxis
										dataKey="label"
										tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
										tickLine={false}
										axisLine={false}
										interval={tickInterval}
									/>
									<YAxis
										allowDecimals={false}
										tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
										tickLine={false}
										axisLine={false}
										width={30}
									/>
									<Tooltip
										contentStyle={{
											background: "hsl(var(--card))",
											border: "1px solid hsl(var(--border))",
											borderRadius: 0,
											fontSize: 12,
										}}
										labelStyle={{ color: "hsl(var(--foreground))" }}
									/>
									<Area
										type="monotone"
										dataKey={kindFilter}
										stroke="hsl(var(--primary))"
										strokeWidth={2}
										fill="url(#trendFill)"
									/>
								</AreaChart>
							</ResponsiveContainer>
						</div>
					)}
				</div>
			</div>

			{/* ── Template activity ── */}
			<div className="space-y-6">
				<h3 className="text-xs font-semibold uppercase tracking-[0.25em] text-secondary">
					Template Activity
				</h3>

				<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
					{activityStatCards.map((card) => (
						<div key={card.label} className="border border-border bg-card p-4">
							<card.icon className="h-4 w-4 text-secondary" />
							{isLoading ? (
								<Skeleton className="mt-3 h-7 w-14" />
							) : (
								<p className="mt-3 font-playfair text-2xl font-bold italic text-foreground">
									{card.value}
								</p>
							)}
							<p className="mt-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
								{card.label}
							</p>
							<p className="mt-0.5 text-[11px] text-muted-foreground/80">
								{card.caption}
							</p>
						</div>
					))}
				</div>

				<div className="border border-border bg-card p-5">
					<h4 className="font-playfair text-lg italic text-foreground">
						Activity overview
					</h4>
					<p className="mt-0.5 text-xs text-muted-foreground">
						Every square is a day over the last 12 months.
					</p>
					{isLoading ? (
						<Skeleton className="mt-4 h-32 w-full" />
					) : (
						<div className="mt-4">
							<ActivityHeatmap data={activityHeatmapData} />
						</div>
					)}
				</div>
			</div>

			{/* Top templates + recent activity */}
			<div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
				<div>
					<h3 className="border-b-2 border-foreground pb-2 font-playfair text-lg italic text-foreground">
						Top templates
					</h3>
					{isLoading ? (
						<div className="mt-4 space-y-3">
							{Array.from({ length: 4 }).map((_, i) => (
								<Skeleton key={i} className="h-12 w-full" />
							))}
						</div>
					) : data && data.top_templates.length > 0 ? (
						<div className="mt-2 divide-y divide-dashed divide-border">
							{data.top_templates.map((t, i) => (
								<div key={t.id} className="flex items-center gap-3 py-3">
									<span className="w-6 shrink-0 font-playfair text-sm italic text-muted-foreground">
										{String(i + 1).padStart(2, "0")}
									</span>
									<div className="h-10 w-14 shrink-0 overflow-hidden bg-muted">
										<img
											src={t.url}
											alt={t.name}
											className="h-full w-full object-cover"
										/>
									</div>
									<p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
										{t.name}
									</p>
									<span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
										<Send className="h-3 w-3" />
										{t.generation_count}
									</span>
								</div>
							))}
						</div>
					) : (
						<p className="mt-4 text-sm text-muted-foreground">
							Nothing generated yet. Once certificates start going out,
							your most-used templates will show up here.
						</p>
					)}
				</div>

				<div>
					<h3 className="border-b-2 border-foreground pb-2 font-playfair text-lg italic text-foreground">
						Recent activity
					</h3>
					{isLoading ? (
						<div className="mt-4 space-y-3">
							{Array.from({ length: 4 }).map((_, i) => (
								<Skeleton key={i} className="h-10 w-full" />
							))}
						</div>
					) : data && data.recent_activity.length > 0 ? (
						<div className="mt-2 divide-y divide-dashed divide-border">
							{data.recent_activity.map((item, i) => (
								<div key={i} className="py-3 text-sm">
									<p className="text-foreground">{recentActivityCopy(item)}</p>
									<p className="mt-0.5 text-xs text-muted-foreground">
										{formatDistanceToNow(parseISO(item.created_at), {
											addSuffix: true,
										})}
									</p>
								</div>
							))}
						</div>
					) : (
						<p className="mt-4 text-sm text-muted-foreground">
							No activity yet.
						</p>
					)}
				</div>
			</div>
			</>
			)}
		</div>
	);
};

export default AnalyticsPage;
