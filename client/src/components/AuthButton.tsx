import { FC, ReactNode } from "react";
import { Button } from "./ui/button";

interface Props {
	onClick: () => void;
	label: string;
	svg: ReactNode;
}

const AuthButton: FC<Props> = ({ onClick, label, svg }) => {
	return (
		<Button
			variant="outline"
			className="w-full h-11 gap-3 font-medium"
			onClick={onClick}
		>
			{svg} {label}
		</Button>
	);
};

export default AuthButton;
