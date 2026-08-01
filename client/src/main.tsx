import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { ThemeProvider } from "next-themes";
import App from "./App.tsx";
import ErrorBoundary from "./components/ErrorBoundary.tsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<ErrorBoundary>
			<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
				<App />
			</ThemeProvider>
		</ErrorBoundary>
	</StrictMode>,
);
