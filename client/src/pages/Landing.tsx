import ThemeToggler from "@/components/dashboard/ThemeToggler";
import { Button } from "@/components/ui/button";
import { useAuthContext } from "@/hooks/useAuthContext";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
	ArrowRight,
	FolderOpen,
	LayoutGrid,
	Send,
	Store,
	Users
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

const SHOWCASE = [
	{ src: "/marketplace/classic-gold.svg", tilt: "-rotate-3" },
	{ src: "/marketplace/modern-minimal.svg", tilt: "rotate-2" },
	{ src: "/marketplace/academic-navy.svg", tilt: "-rotate-1" },
];

const STEPS = [
	{
		no: "01",
		title: "Upload a template",
		description:
			"Bring your own certificate design, or start from a ready-made one in the marketplace.",
	},
	{
		no: "02",
		title: "Personalize it",
		description:
			"Drag text straight onto the canvas, pick fonts and colors, add as many fields as you need.",
	},
	{
		no: "03",
		title: "Share or batch-generate",
		description:
			"Publish a link so each recipient fills in their own name, or generate hundreds at once as a ZIP.",
	},
];

const FEATURES = [
	{
		icon: LayoutGrid,
		title: "Templates & Collections",
		description: "Keep every design organized by event or purpose.",
	},
	{
		icon: Users,
		title: "Batch Generation",
		description: "Turn a recipient list into hundreds of certificates.",
	},
	{
		icon: Send,
		title: "Self-serve Links",
		description: "Recipients type their own name and download instantly.",
	},
	{
		icon: Store,
		title: "Marketplace",
		description: "Skip the blank page with ready-made designs.",
	},
];

const Landing = () => {
	const navigate = useNavigate();
	const { isAuthenticated, loading } = useAuthContext();

	const goToAccount = () => {
		if (!loading && isAuthenticated) {
			navigate("/dashboard");
		} else {
			navigate("/login");
		}
	};

	return (
		<div className="min-h-screen bg-background text-foreground">
			{/* Minimal nav */}
			<header className="border-b-4 border-foreground">
				<div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-5 sm:px-8">
					<Link
						to="/"
						className="font-playfair text-2xl font-bold italic tracking-tight text-foreground"
					>
						genC
					</Link>
					<div className="flex items-center gap-3">
						<ThemeToggler />
						<Button variant="outline" size="sm" onClick={goToAccount}>
							{!loading && isAuthenticated ? "Dashboard" : "Sign In"}
						</Button>
					</div>
				</div>
			</header>

			{/* Hero */}
			<section className="mx-auto grid max-w-[1400px] grid-cols-1 gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-12 lg:gap-8">
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.4 }}
					className="lg:col-span-7"
				>
					<h1 className="mt-4 font-playfair text-4xl italic leading-[1.05] tracking-tight text-foreground sm:text-6xl">
						Certificates people
						<br />
						actually want to{" "}
						<span className="text-primary">keep</span>.
					</h1>
					<p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">
						Design a certificate once, then let genC do the tedious
						part — personalizing it for every single recipient,
						whether that's one download or a thousand.
					</p>

					<div className="mt-8 flex flex-wrap items-center gap-3">
						<Button
							size="lg"
							className="gap-2 shadow-sm"
							onClick={() => navigate("/editor")}
						>
							Try it free
							<ArrowRight className="h-4 w-4" />
						</Button>
						<Button
							size="lg"
							variant="outline"
							className="bg-background"
							onClick={goToAccount}
						>
							{!loading && isAuthenticated
								? "Go to dashboard"
								: "Sign in"}
						</Button>
					</div>
					<p className="mt-3 text-xs text-muted-foreground">
						No account needed to try it out.
					</p>
				</motion.div>

				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.4, delay: 0.1 }}
					className="relative flex items-center justify-center lg:col-span-5"
				>
					<div className="relative flex items-center justify-center gap-2">
						{SHOWCASE.map((item, i) => (
							<div
								key={item.src}
								className={cn(
									"w-40 shrink-0 border border-foreground bg-card p-2 shadow-[4px_4px_0_hsl(var(--foreground)/0.18)] sm:w-48",
									item.tilt,
									i > 0 && "-ml-10",
								)}
								style={{ zIndex: i }}
							>
								<img
									src={item.src}
									alt="Sample certificate"
									className="aspect-[1.414/1] w-full object-cover"
								/>
							</div>
						))}
					</div>
				</motion.div>
			</section>

			{/* How it works */}
			<section className="border-t border-border bg-muted/30">
				<div className="mx-auto max-w-[1400px] px-5 py-16 sm:px-8 sm:py-20">
					<h2 className="font-playfair text-2xl italic text-foreground sm:text-3xl">
						How it works
					</h2>
					<div className="mt-10 grid grid-cols-1 gap-10 sm:grid-cols-3 sm:gap-8">
						{STEPS.map((step) => (
							<div key={step.no}>
								<span className="font-playfair text-4xl italic text-primary/30">
									{step.no}
								</span>
								<h3 className="mt-2 text-lg font-semibold text-foreground">
									{step.title}
								</h3>
								<p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
									{step.description}
								</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Feature bento */}
			<section className="mx-auto max-w-[1400px] px-5 py-16 sm:px-8 sm:py-20">
				<h2 className="font-playfair text-2xl italic text-foreground sm:text-3xl">
					Everything you need, nothing you don't
				</h2>
				<div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
					{FEATURES.map((feature) => (
						<div
							key={feature.title}
							className="border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-md"
						>
							<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
								<feature.icon className="h-4 w-4" />
							</div>
							<h3 className="mt-3 text-sm font-semibold text-foreground">
								{feature.title}
							</h3>
							<p className="mt-1 text-xs leading-relaxed text-muted-foreground">
								{feature.description}
							</p>
						</div>
					))}
				</div>
			</section>

			{/* CTA band */}
			<section className="border-t-4 border-foreground bg-foreground text-background">
				<div className="mx-auto flex max-w-[1400px] flex-col items-center gap-5 px-5 py-16 text-center sm:px-8">
					<h2 className="font-playfair text-3xl italic sm:text-4xl">
						Ready to design your first certificate?
					</h2>
					<p className="max-w-md text-sm text-background/70">
						It takes less than a minute to upload a template and see
						your first certificate come together.
					</p>
					<Button
						size="lg"
						className="gap-2 bg-primary text-primary-foreground shadow-none hover:bg-primary/90"
						onClick={() => navigate("/editor")}
					>
						Try it free
						<ArrowRight className="h-4 w-4" />
					</Button>
				</div>
			</section>

			{/* Footer */}
			<footer className="border-t border-border">
				<div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-4 px-5 py-8 text-xs text-muted-foreground sm:flex-row sm:px-8">
					<span className="font-playfair italic text-foreground">
						genC
					</span>
					<div className="flex items-center gap-5">
						<Link
							to="/marketplace"
							className="flex items-center gap-1.5 hover:text-foreground"
						>
							<FolderOpen className="h-3.5 w-3.5" />
							Marketplace
						</Link>
						<Link to="/login" className="hover:text-foreground">
							Sign in
						</Link>
						<Link to="/signup" className="hover:text-foreground">
							Create account
						</Link>
					</div>
				</div>
			</footer>
		</div>
	);
};

export default Landing;
