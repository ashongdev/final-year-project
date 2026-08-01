import CertificatePreview from "@/components/CertificatePreview";
import EditorAuthFooter from "@/components/EditorAuthFooter";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
	MARKETPLACE_CATEGORIES,
	marketplaceTemplates,
} from "@/config/marketplaceTemplates";
import { openMarketplaceTemplateInEditor } from "@/lib/editorUtils";
import { cn } from "@/lib/utils";
import type {
	MarketplaceCategory,
	MarketplaceTemplate,
} from "@/types/MarketplaceTemplate";
import { AnimatePresence, motion } from "framer-motion";
import { FlaskConical, Search, Sparkles } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const TILT = ["-rotate-2", "rotate-1", "-rotate-1", "rotate-2"];

const Marketplace = () => {
	const navigate = useNavigate();
	const [searchQuery, setSearchQuery] = useState("");
	const [activeCategory, setActiveCategory] =
		useState<MarketplaceCategory>("all");
	const [previewTemplate, setPreviewTemplate] =
		useState<MarketplaceTemplate | null>(null);

	const previewRef = useRef<HTMLDivElement>(null);
	const imgRef = useRef<HTMLImageElement>(null);

	const filteredTemplates = useMemo(() => {
		const query = searchQuery.trim().toLowerCase();

		return marketplaceTemplates.filter((template) => {
			const matchesCategory =
				activeCategory === "all" ||
				template.category === activeCategory;
			const matchesSearch =
				!query ||
				template.name.toLowerCase().includes(query) ||
				template.description.toLowerCase().includes(query) ||
				template.tags.some((tag) => tag.toLowerCase().includes(query));

			return matchesCategory && matchesSearch;
		});
	}, [activeCategory, searchQuery]);

	const handleUseTemplate = (mode: "testing" | "actual") => {
		if (!previewTemplate) return;
		openMarketplaceTemplateInEditor(navigate, previewTemplate, mode);
		setPreviewTemplate(null);
	};

	return (
		<div className="flex min-h-screen flex-col bg-background">
			<Header onTourClick={() => {}} />

			<main className="mx-auto w-full max-w-[1400px] flex-1 px-5 py-12 sm:px-8">
				{/* Byline header */}
				<div className="relative">
					<span
						aria-hidden
						className="pointer-events-none absolute -left-2 -top-12 select-none font-playfair text-[7rem] font-bold italic leading-none text-foreground/[0.04] sm:text-[9rem]"
					>
						02
					</span>
					<div className="relative flex flex-col justify-between gap-5 border-b-2 border-foreground pb-4 sm:flex-row sm:items-end">
						<div>
							<h1 className="mt-1 font-playfair text-3xl italic text-foreground sm:text-4xl">
								Template Marketplace
							</h1>
							<p className="mt-1 max-w-lg text-sm text-muted-foreground">
								Browse ready-made certificate templates. Preview
								any design, then try it with sample data or use
								it for real.
							</p>
						</div>
						<div className="relative w-full sm:max-w-xs">
							<Search className="absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								placeholder="Search templates…"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="rounded-none border-x-0 border-t-0 border-b-2 border-foreground/30 bg-transparent pl-6 focus-visible:border-primary focus-visible:ring-0"
							/>
						</div>
					</div>
				</div>

				{/* Category filter as TOC-style tabs */}
				<div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-semibold uppercase tracking-[0.15em]">
					{MARKETPLACE_CATEGORIES.map((category) => (
						<button
							key={category.id}
							onClick={() => setActiveCategory(category.id)}
							className={cn(
								"border-b-2 pb-0.5 transition-colors",
								activeCategory === category.id
									? "border-primary text-primary"
									: "border-transparent text-muted-foreground hover:text-foreground",
							)}
						>
							{category.label}
						</button>
					))}
				</div>

				{filteredTemplates.length === 0 ? (
					<div className="mt-16 flex flex-col items-center gap-2 border-2 border-dashed border-border py-20 text-center">
						<p className="font-playfair text-2xl italic text-foreground">
							Nothing matches
						</p>
						<p className="font-hand text-xl text-secondary">
							try a different search or category
						</p>
					</div>
				) : (
					<div className="mt-12 flex flex-wrap items-start gap-x-6 gap-y-12">
						<AnimatePresence mode="popLayout">
							{filteredTemplates.map((template, index) => (
								<motion.button
									key={template.id}
									type="button"
									layout
									initial={{ opacity: 0, y: 16 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, scale: 0.95 }}
									transition={{
										duration: 0.25,
										delay: index * 0.03,
									}}
									onClick={() => setPreviewTemplate(template)}
									className={cn(
										"group w-52 shrink-0 border border-border bg-card p-3 pb-5 text-left shadow-[3px_3px_0_hsl(var(--foreground)/0.12)] transition-all hover:z-10 hover:-translate-y-1 hover:rotate-0 hover:shadow-[5px_5px_0_hsl(var(--foreground)/0.2)] sm:w-60",
										TILT[index % TILT.length],
									)}
								>
									<div className="relative aspect-[1.414/1] w-full overflow-hidden bg-muted">
										<img
											src={template.imageUrl}
											alt={template.name}
											className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
										/>
									</div>
									<p className="font-hand mt-3 truncate text-2xl text-foreground">
										{template.name}
									</p>
									<p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
										{template.description}
									</p>
									<div className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-[10px] uppercase tracking-wider text-secondary">
										{template.tags.slice(0, 3).map((tag) => (
											<span key={tag}>#{tag}</span>
										))}
									</div>
								</motion.button>
							))}
						</AnimatePresence>
					</div>
				)}
			</main>

			<Dialog
				open={previewTemplate !== null}
				onOpenChange={(open) => {
					if (!open) setPreviewTemplate(null);
				}}
			>
				<DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
					{previewTemplate && (
						<>
							<DialogHeader>
								<DialogTitle className="font-playfair text-2xl italic">
									{previewTemplate.name}
								</DialogTitle>
								<DialogDescription>
									{previewTemplate.description}
								</DialogDescription>
							</DialogHeader>

							<div className="py-4">
								<div className="h-[340px] sm:h-[420px]">
									<CertificatePreview
										templateUrl={previewTemplate.imageUrl}
										fields={previewTemplate.fields}
										selectedFieldId={
											previewTemplate.fields[0]?.id ??
											"field-1"
										}
										onFieldSelect={() => {}}
										showPreview={true}
										previewRef={previewRef}
										imgRef={imgRef}
									/>
								</div>
							</div>

							<div className="space-y-2 border-2 border-dashed border-border p-4">
								<p className="text-sm font-medium">
									How would you like to use this template?
								</p>
								<ul className="space-y-1 text-sm text-muted-foreground">
									<li className="flex items-center gap-2">
										<FlaskConical className="h-4 w-4 shrink-0" />
										<span>
											<strong className="text-foreground">
												Try with sample data
											</strong>
										</span>
									</li>
									<li className="flex items-center gap-2">
										<Sparkles className="h-4 w-4 shrink-0" />
										<span>
											<strong className="text-foreground">
												Use template
											</strong>
										</span>
									</li>
								</ul>
							</div>

							<DialogFooter className="flex-col gap-2 sm:flex-row">
								<Button
									variant="outline"
									onClick={() => setPreviewTemplate(null)}
								>
									Cancel
								</Button>
								<Button
									variant="secondary"
									className="gap-2"
									onClick={() => handleUseTemplate("testing")}
								>
									<FlaskConical className="h-4 w-4" />
									Try with sample data
								</Button>
								<Button
									className="gap-2"
									onClick={() => handleUseTemplate("actual")}
								>
									<Sparkles className="h-4 w-4" />
									Use template
								</Button>
							</DialogFooter>
						</>
					)}
				</DialogContent>
			</Dialog>

			<EditorAuthFooter />
		</div>
	);
};

export default Marketplace;
