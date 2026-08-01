import { v4 as uuidv4 } from "uuid";
import type { TextField } from "@/types/TextField";

export const createDefaultTextField = (): TextField => ({
	id: uuidv4(),
	label: "Participant Name",
	text: "John Doe",
	x: 0,
	y: 0,
	font: "Bickham Script Pro Regular",
	fontSize: 100,
	fontWeight: "300",
	color: "#000000",
	anchorMode: "center",
	required: true,
});
