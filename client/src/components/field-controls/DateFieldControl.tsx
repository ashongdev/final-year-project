import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { DATE_FORMAT_OPTIONS, DEFAULT_DATE_FORMAT } from "@/lib/fieldPresets";
import { TextField } from "@/types/TextField";
import { format, parseISO } from "date-fns";
import { CalendarIcon } from "lucide-react";

interface DateFieldControlProps {
	field: TextField;
	onFieldUpdate: (updates: Partial<TextField>) => void;
}

const DateFieldControl = ({ field, onFieldUpdate }: DateFieldControlProps) => (
	<div className="space-y-2">
		<label className="text-xs text-muted-foreground">Date</label>
		<div className="flex gap-2">
			<Popover>
				<PopoverTrigger asChild>
					<button className="flex h-8 flex-1 items-center gap-2 rounded-md border border-input bg-background px-3 text-xs">
						<CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
						{field.text}
					</button>
				</PopoverTrigger>
				<PopoverContent className="w-auto p-0" align="start">
					<Calendar
						mode="single"
						selected={field.rawDate ? parseISO(field.rawDate) : undefined}
						onSelect={(date) => {
							if (!date) return;
							const dateFormat = field.dateFormat ?? DEFAULT_DATE_FORMAT;
							onFieldUpdate({
								rawDate: format(date, "yyyy-MM-dd"),
								text: format(date, dateFormat),
							});
						}}
						initialFocus
					/>
				</PopoverContent>
			</Popover>
			<Select
				value={field.dateFormat ?? DEFAULT_DATE_FORMAT}
				onValueChange={(dateFormat) => {
					// If a real date has been picked, reformat it; otherwise keep
					// showing the pattern itself as a placeholder, updated to
					// match the new format.
					const updates: Partial<TextField> = {
						dateFormat,
						text: field.rawDate
							? format(parseISO(field.rawDate), dateFormat)
							: dateFormat,
					};
					onFieldUpdate(updates);
				}}
			>
				<SelectTrigger className="h-8 w-[110px] shrink-0 text-xs">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{DATE_FORMAT_OPTIONS.map((opt) => (
						<SelectItem key={opt.value} value={opt.value} className="text-xs">
							{opt.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	</div>
);

export default DateFieldControl;
