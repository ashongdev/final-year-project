import DashboardMasthead from "@/components/dashboard/DashboardMasthead";
import DashboardRoutes from "./DashboardRoutes";

const DashboardLayout = () => {
	return (
		<div className="min-h-screen bg-background text-foreground">
			<DashboardMasthead />

			<main className="mx-auto w-full max-w-[1400px] px-5 py-10 sm:px-8 sm:py-14">
				<DashboardRoutes />
			</main>
		</div>
	);
};

export default DashboardLayout;
