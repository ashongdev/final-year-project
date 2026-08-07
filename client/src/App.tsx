import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import AnalyticsTracker from "./components/AnalyticsTracker";
import ErrorBoundary from "./components/ErrorBoundary";
import ProtectedRoute from "./components/ProtectedRoute";
import RequireProRoute from "./components/RequireProRoute";
import { AuthProvider } from "./context/AuthContext";
import Advanced from "./pages/Advanced";
import Editor from "./pages/Editor";
import ForgotPassword from "./pages/ForgotPassword";
import GoogleCallback from "./pages/GoogleCallback";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Marketplace from "./pages/Marketplace";
import NotFound from "./pages/NotFound";
import Participant from "./pages/Participant";
import Pricing from "./pages/Pricing";
import ResetPassword from "./pages/ResetPassword";
import Signup from "./pages/Signup";
import VerifyEmail from "./pages/VerifyEmail";
import DashboardLayout from "./pages/dashboard/DashboardLayout";

// Instantiated once, outside the component tree so it survives re-renders.
const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			retry: 1,
			staleTime: 30_000,
		},
	},
});

const App = () => (
	<QueryClientProvider client={queryClient}>
		<TooltipProvider>
			<Toaster />
			<Sonner />
			<BrowserRouter>
				<AuthProvider>
					<AnalyticsTracker />
					<ErrorBoundary>
						<Routes>
							<Route path="/" element={<Landing />} />
							<Route path="/editor" element={<Editor />} />
							<Route path="/marketplace" element={<Marketplace />} />
							<Route path="/pricing" element={<Pricing />} />
							<Route
								path="/advanced"
								element={
									<ProtectedRoute>
										<RequireProRoute>
											<Advanced />
										</RequireProRoute>
									</ProtectedRoute>
								}
							/>
							<Route path="/participant" element={<Participant />} />
							<Route
								path="/auth/google/callback" 
								 element={<GoogleCallback />}/> 
							<Route path="/login" element={<Login />} />
							<Route path="/signup" element={<Signup />} />
							<Route path="/verify-email" element={<VerifyEmail />} />
							<Route
								path="/forgot-password"
								element={<ForgotPassword />}
							/>
							<Route
								path="/reset-password"
								element={<ResetPassword />}
							/>
							<Route
								path="/dashboard/*"
								element={
									<ProtectedRoute>
										<DashboardLayout />
									</ProtectedRoute>
								}
							/>
							<Route path="*" element={<NotFound />} />
						</Routes>
					</ErrorBoundary>
				</AuthProvider>
			</BrowserRouter>
		</TooltipProvider>
	</QueryClientProvider>
);

export default App;
