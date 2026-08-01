import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
	const location = useLocation();

	useEffect(() => {
		console.error(
			"404 Error: User attempted to access non-existent route:",
			location.pathname,
		);
	}, [location.pathname]);

	return (
		<div className="flex min-h-screen items-center justify-center bg-background px-6">
			<div className="text-center">
				<p className="font-playfair text-[8rem] font-bold italic leading-none text-foreground/10 sm:text-[11rem]">
					404
				</p>
				<h1 className="-mt-8 font-playfair text-3xl italic text-foreground sm:-mt-10 sm:text-4xl">
					This page has been misfiled.
				</h1>
				<p className="font-hand mt-3 text-2xl text-secondary">
					{location.pathname}
				</p>
				<a
					href="/"
					className="mt-6 inline-block border-2 border-foreground bg-primary px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-primary-foreground shadow-[3px_3px_0_hsl(var(--foreground))] transition-all hover:-translate-y-0.5"
				>
					Return to Home
				</a>
			</div>
		</div>
	);
};

export default NotFound;
