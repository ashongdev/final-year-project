import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";
import { useAuthContext } from "@/hooks/useAuthContext";

const EditorAuthFooter = () => {
	const navigate = useNavigate();
	const { isAuthenticated, loading } = useAuthContext();

	if (loading || isAuthenticated) return null;

	return (
		<div className="fixed bottom-6 left-6 flex items-center gap-3">
			<Button size="sm" onClick={() => navigate("/login")} className="gap-2">
				<LogIn className="h-4 w-4" />
				Login
			</Button>
		</div>
	);
};

export default EditorAuthFooter;
