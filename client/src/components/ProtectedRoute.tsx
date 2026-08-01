import { useAuthContext } from "@/hooks/useAuthContext";
import { Link, useLocation } from "react-router-dom";

interface ProtectedRouteProps {
	children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
	const { isAuthenticated, loading } = useAuthContext();
	const location = useLocation();

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-background">
				<div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
			</div>
		);
	}

	if (!isAuthenticated) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-background px-6">
				<div className="text-center">
					<p className="font-playfair text-[6rem] font-bold italic leading-none text-foreground/10 sm:text-[8rem]">
						Locked
					</p>
					<h1 className="-mt-6 font-playfair text-3xl italic text-foreground sm:-mt-8 sm:text-4xl">
						You'll need to sign in first.
					</h1>
					<p className="font-hand mt-3 text-2xl text-secondary">
						This page is for signed-in accounts only
					</p>
					<div className="mt-6 flex flex-wrap items-center justify-center gap-3">
						<Link
							to="/login"
							state={{ from: location }}
							className="inline-block border-2 border-foreground bg-primary px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-primary-foreground shadow-[3px_3px_0_hsl(var(--foreground))] transition-all hover:-translate-y-0.5"
						>
							Sign In
						</Link>
						<Link
							to="/"
							className="inline-block border-2 border-foreground bg-background px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-foreground transition-all hover:-translate-y-0.5"
						>
							Back to Home
						</Link>
					</div>
				</div>
			</div>
		);
	}

	return <>{children}</>;
};

export default ProtectedRoute;
