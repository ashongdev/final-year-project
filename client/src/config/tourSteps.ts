import { DriveStep } from "driver.js";

// Centralized tour step configuration
// Each step MUST have an 'element' selector to anchor the tooltip
// The tour will automatically scroll to and spotlight each element

export const indexPageTourSteps: DriveStep[] = [
	{
		element: '[data-tour="tabs"]',
		popover: {
			title: "Simple Editor",
			description:
				"You are in Simple Mode. Perfect for certificates with just a name. Switch to Advanced below for multiple fields.",
			side: "bottom",
			align: "start",
		},
	},
	{
		element: '[data-tour="certificate-preview"]',
		popover: {
			title: "Live Preview",
			description:
				"Drag and drop the name anywhere on the certificate. Use the control panel to change fonts and colors.",
			side: "left",
			align: "center",
		},
	},
	{
		element: "header",
		popover: {
			title: "Ready to Start?",
			description:
				"Upload a template and customize the participant name style.",
			side: "bottom",
			align: "center",
		},
	},
];

export const advancedPageTourSteps: DriveStep[] = [
	{
		element: '[data-tour="tabs"]',
		popover: {
			title: "Advanced Editor 🚀",
			description:
				"Welcome to the Advanced Editor! Here you can add multiple dynamic fields like Date, Position etc.",
			side: "bottom",
			align: "start",
		},
	},
	{
		element: '[data-tour="fields-list"]',
		popover: {
			title: "Manage Fields",
			description:
				"View all your text fields here. Click on a field to edit its settings.",
			side: "right",
			align: "start",
		},
	},
	{
		element: '[data-tour="add-field-btn"]',
		popover: {
			title: "Add New Fields",
			description:
				"Need more text? Click Add to place a new text block on the certificate.",
			side: "left",
			align: "center",
		},
	},
	{
		element: '[data-tour="required-toggle"]',
		popover: {
			title: "Participant Input Control",
			description:
				"Toggle this ON to force participants to enter this data. Toggle OFF to make it static text (read-only for them).",
			side: "left",
			align: "center",
		},
	},
	{
		element: '[data-tour="control-panel"]',
		popover: {
			title: "Full Customization",
			description:
				"Control fonts, colors, and sizes for each field independently.",
			side: "left",
			align: "start",
		},
	},
	{
		element: '[data-tour="share-button"]',
		popover: {
			title: "Share Template",
			description:
				"Generate a unique link. Participants will get a form asking only for the 'Required' fields you set up.",
			side: "left",
			align: "center",
		},
	},
];

export const participantPageTourSteps: DriveStep[] = [
	{
		element: '[data-tour="certificate-id-input"]',
		popover: {
			title: "Enter Your ID",
			description:
				"Paste the certificate ID you received from the event organizer.",
			side: "bottom",
			align: "start",
		},
	},
	{
		element: '[data-tour="retrieve-btn"]',
		popover: {
			title: "Load Certificate",
			description:
				"Click this button to retrieve your certificate template. You'll then be able to customize and download it.",
			side: "left",
			align: "center",
		},
	},
];

export const TOUR_STORAGE_KEYS = {
	index: "tour_completed_index",
	advanced: "tour_completed_advanced",
	participant: "tour_completed_participant",
} as const;
