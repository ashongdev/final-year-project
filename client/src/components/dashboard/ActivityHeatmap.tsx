import { cn } from "@/lib/utils";
import type { ActivityDailyPoint } from "@/types/Analytics";
import { format, getDay, parseISO } from "date-fns";
import { useState } from "react";

interface Props {
	data: ActivityDailyPoint[];
}

// Sequential ramp: one hue (primary), light -> dark, zero state in neutral
// muted. Colorblind-safe by construction since it's a single hue varying in
// intensity, not multiple hues being told apart.
const HEAT_LEVEL_CLASSES = [
	"bg-muted",
	"bg-primary/25",
	"bg-primary/50",
	"bg-primary/75",
	"bg-primary",
];

const DAY_ROW_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];

const getTotal = (d: ActivityDailyPoint) =>
	d.templates_created + d.links_shared + d.templates_loaded;

const getHeatLevel = (count: number, max: number) => {
	if (count === 0) return 0;
	const ratio = count / max;
	if (ratio > 0.75) return 4;
	if (ratio > 0.5) return 3;
	if (ratio > 0.25) return 2;
	return 1;
};

type GridCell =
	| { kind: "corner" }
	| { kind: "monthLabel"; label: string }
	| { kind: "dayLabel"; label: string }
	| { kind: "day"; day: ActivityDailyPoint }
	| { kind: "empty" };

interface HoverState {
	day: ActivityDailyPoint;
	x: number;
	y: number;
}

const ActivityHeatmap = ({ data }: Props) => {
	const [hovered, setHovered] = useState<HoverState | null>(null);

	if (data.length === 0) {
		return <p className="text-sm text-muted-foreground">No activity yet.</p>;
	}

	const maxDaily = Math.max(1, ...data.map(getTotal));

	// Left-pad so the first real day lands in its correct day-of-week row,
	// matching a real calendar grid (columns = weeks, rows = Sun..Sat). This
	// is a rolling 365-day window ending today, not a fixed Jan-Dec year —
	// the same convention GitHub's own contribution graph uses, which is why
	// the leftmost month is "whatever month it was a year ago," not January.
	const leadingEmpty = getDay(parseISO(data[0].date));
	const cells: (ActivityDailyPoint | null)[] = [
		...Array.from({ length: leadingEmpty }, () => null),
		...data,
	];

	const weeks: (ActivityDailyPoint | null)[][] = [];
	for (let i = 0; i < cells.length; i += 7) {
		weeks.push(cells.slice(i, i + 7));
	}

	// A month label appears once, above the first week column that contains
	// a day from that month.
	let lastMonth = -1;
	const monthLabels = weeks.map((week) => {
		const firstDay = week.find((c) => c !== null);
		if (!firstDay) return "";
		const month = parseISO(firstDay.date).getMonth();
		if (month === lastMonth) return "";
		lastMonth = month;
		return format(parseISO(firstDay.date), "MMM");
	});

	// Single CSS grid (label column + one column per week, all sharing row
	// heights) so the week columns can stretch as `1fr` to fill the full
	// container width instead of sitting at a fixed pixel size with empty
	// space to the right.
	const gridCells: GridCell[] = [{ kind: "corner" }];
	monthLabels.forEach((label) => gridCells.push({ kind: "monthLabel", label }));
	for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
		gridCells.push({ kind: "dayLabel", label: DAY_ROW_LABELS[dayIdx] });
		weeks.forEach((week) => {
			const day = week[dayIdx];
			gridCells.push(day ? { kind: "day", day } : { kind: "empty" });
		});
	}

	return (
		<div className="relative">
			<div className="overflow-x-auto pb-1">
				<div
					className="grid min-w-[480px] gap-[3px]"
					style={{
						gridTemplateColumns: `28px repeat(${weeks.length}, minmax(0, 1fr))`,
					}}
				>
					{gridCells.map((cell, i) => {
						switch (cell.kind) {
							case "corner":
								return <div key={i} />;
							case "monthLabel":
								return (
									<span
										key={i}
										className="h-[12px] text-[9px] leading-none text-muted-foreground"
									>
										{cell.label}
									</span>
								);
							case "dayLabel":
								return (
									<span
										key={i}
										className="flex h-3 items-center text-[9px] leading-none text-muted-foreground"
									>
										{cell.label}
									</span>
								);
							case "empty":
								return <div key={i} className="h-3 w-full" />;
							case "day":
								return (
									<div
										key={i}
										onMouseMove={(e) =>
											setHovered({
												day: cell.day,
												x: e.clientX,
												y: e.clientY,
											})
										}
										onMouseLeave={() => setHovered(null)}
										className={cn(
											"h-3 w-full cursor-default rounded-[2px]",
											HEAT_LEVEL_CLASSES[
												getHeatLevel(getTotal(cell.day), maxDaily)
											],
										)}
									/>
								);
						}
					})}
				</div>
			</div>
			<div className="mt-3 flex items-center gap-1.5 text-[10px] text-muted-foreground">
				<span>Less</span>
				{HEAT_LEVEL_CLASSES.map((cls, i) => (
					<span key={i} className={cn("h-[11px] w-[11px] rounded-[2px]", cls)} />
				))}
				<span>More</span>
			</div>

			{hovered && (
				<div
					className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-[calc(100%+10px)] whitespace-nowrap rounded-sm border border-border bg-card px-2 py-1.5 text-xs shadow-md"
					style={{ left: hovered.x, top: hovered.y }}
				>
					<p className="font-medium text-foreground">
						{format(parseISO(hovered.day.date), "MMM d, yyyy")}
					</p>
					<p className="text-muted-foreground">
						{getTotal(hovered.day)} action
						{getTotal(hovered.day) !== 1 ? "s" : ""} —{" "}
						{hovered.day.templates_created} created,{" "}
						{hovered.day.links_shared} shared, {hovered.day.templates_loaded}{" "}
						loaded
					</p>
				</div>
			)}
		</div>
	);
};

export default ActivityHeatmap;
