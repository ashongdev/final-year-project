import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	CERTIFICATE_FONTS,
	FONT_WEIGHTS,
	PREDEFINED_COLORS,
} from "@/lib/utils";
import { motion } from "framer-motion";
import { Download, Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";

interface ParticipantControlPanelProps {
	participantName: string;
	onParticipantNameChange: (name: string) => void;
	selectedFont: string;
	onFontChange: (font: string) => void;
	fontSize: number;
	onFontSizeChange: (size: number) => void;
	fontWeight: string;
	onFontWeightChange: (weight: string) => void;
	textColor: string;
	onTextColorChange: (color: string) => void;
	onDownload: () => Promise<void> | void;
	onBack: () => void;
	hasName: boolean;
	/** Once the recipient has verified their email, their name is locked. */
	nameLocked?: boolean;
}

const ParticipantControlPanel = ({
	participantName,
	onParticipantNameChange,
	selectedFont,
	onFontChange,
	fontSize,
	onFontSizeChange,
	fontWeight,
	onFontWeightChange,
	textColor,
	onTextColorChange,
	onDownload,
	onBack,
	hasName,
	nameLocked = false,
}: ParticipantControlPanelProps) => {
	const [isDownloading, setIsDownloading] = useState(false);

	const handleDownload = async () => {
		if (isDownloading) return;
		setIsDownloading(true);
		try {
			await Promise.resolve(onDownload());
		} finally {
			setIsDownloading(false);
		}
	};

	return (
		<ScrollArea className="h-[70vh] pr-3 overflow-x-hidden">
			<motion.div
				initial={{ opacity: 0, x: 20 }}
				animate={{ opacity: 1, x: 0 }}
				transition={{ duration: 0.4, delay: 0.1 }}
				className="flex flex-col space-y-8 pl-4"
			>
				{/* Name Input */}
				<div className="space-y-3">
					<h3 className="text-sm font-medium flex items-center gap-1.5">
						Your Name
						{nameLocked && (
							<ShieldCheck className="w-3.5 h-3.5 text-primary" />
						)}
					</h3>
					<Input
						value={participantName}
						disabled={nameLocked}
						onChange={(e) =>
							onParticipantNameChange(e.target.value)
						}
						placeholder="Enter your name..."
						className="w-full"
					/>
				</div>

				{/* Font Selection */}
				<div className="space-y-3">
					<h3 className="text-sm font-medium">Font Family</h3>
					<Select value={selectedFont} onValueChange={onFontChange}>
						<SelectTrigger className="w-full">
							<SelectValue placeholder="Select font" />
						</SelectTrigger>
						<SelectContent>
							{CERTIFICATE_FONTS.map((font) => (
								<SelectItem key={font.value} value={font.value}>
									<span style={{ fontFamily: font.value }}>
										{font.label}
									</span>
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				{/* Font Size */}
				<div className="space-y-3">
					<h3 className="text-sm font-medium">Font Size</h3>
					<Input
						type="number"
						value={fontSize}
						onChange={(e) =>
							onFontSizeChange(Number(e.target.value))
						}
						min={12}
						max={200}
						className="w-full"
					/>
				</div>

				{/* Font Weight */}
				<div className="space-y-3">
					<h3 className="text-sm font-medium">Font Weight</h3>
					<Select
						value={fontWeight}
						onValueChange={onFontWeightChange}
					>
						<SelectTrigger className="w-full">
							<SelectValue placeholder="Select weight" />
						</SelectTrigger>
						<SelectContent>
							{FONT_WEIGHTS.map((weight) => (
								<SelectItem
									key={weight.value}
									value={weight.value}
								>
									{weight.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				{/* Text Color */}
				<div className="space-y-3">
					<h3 className="text-sm font-medium">Text Color</h3>
					<div className="space-y-2">
						<Input
							type="text"
							value={textColor}
							onChange={(e) => onTextColorChange(e.target.value)}
							placeholder="#000000 or rgb(0,0,0)"
							className="w-full font-mono text-sm"
							maxLength={30}
						/>
						<div className="grid grid-cols-4 gap-2">
							{PREDEFINED_COLORS.map((color) => (
								<button
									key={color.value}
									onClick={() =>
										onTextColorChange(color.value)
									}
									className="h-10 rounded border-2 transition-smooth hover:scale-105"
									style={{
										backgroundColor: color.value,
										borderColor:
											textColor === color.value
												? "hsl(var(--primary))"
												: "hsl(var(--border))",
									}}
									title={color.label}
								/>
							))}
						</div>
					</div>
				</div>

				{/* Action Buttons */}
				<div className="space-y-3 pt-4 border-t border-border">
					<Button
						onClick={handleDownload}
						disabled={!hasName || isDownloading}
						className="w-full bg-primary hover:bg-primary/90 text-primary-foreground transition-smooth"
					>
						{isDownloading ? (
							<Loader2 className="w-4 h-4 mr-2 animate-spin" />
						) : (
							<Download className="w-4 h-4 mr-2" />
						)}
						Download Certificate
					</Button>
					<Button
						variant="outline"
						onClick={onBack}
						className="w-full"
					>
						Back to ID Entry
					</Button>
				</div>
			</motion.div>
		</ScrollArea>
	);
};

export default ParticipantControlPanel;
