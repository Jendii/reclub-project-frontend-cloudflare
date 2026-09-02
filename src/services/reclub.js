const apiBaseUrl = import.meta.env.VITE_RECLUB_API_URL;

export function extractConfirmedNames(document) {
	const confirmedText = [...document.querySelectorAll("p")].find((element) =>
		element.textContent.trim().startsWith("Confirmed"),
	);

	if (!confirmedText) {
		throw new Error("Confirmed section not found on that RSVP page.");
	}

	const confirmedCard = confirmedText.closest(".rounded-md");
	if (!confirmedCard) {
		throw new Error("The confirmed players card was not found.");
	}

	const names = [
		...confirmedCard.querySelectorAll(
			".grid.grid-cols-4 > a p, .grid.grid-cols-4 > div p",
		),
	]
		.map((element) => element.textContent.trim())
		.filter((name) => name.length > 0 && name !== "+1");

	console.log("Confirmed player names:", names);
	return names;
}

export async function fetchConfirmedPlayers(rsvpUrl) {
	if (!apiBaseUrl) {
		const response = await fetch(
			`/api/reclub?url=${encodeURIComponent(rsvpUrl)}`,
		);
		if (!response.ok) throw new Error("Please enter a valid RSVP link.");
		const html = await response.text();
		const document = new DOMParser().parseFromString(html, "text/html");
		return toPlayers(extractConfirmedNames(document));
	}

	const response = await fetch(
		`${apiBaseUrl.replace(/\/$/, "")}/rsvp/players?url=${encodeURIComponent(rsvpUrl)}`,
	);
	if (!response.ok) {
		throw new Error(
			"Could not read that RSVP link. Check the link and try again.",
		);
	}

	const data = await response.json();
	if (!Array.isArray(data.players)) {
		throw new Error("The RSVP service returned an unexpected response.");
	}

	return toPlayers(
		data.players
			.filter((player) => player.status === "confirmed")
			.map((player) => player.name),
	);
}

function toPlayers(names) {
	return names.map((name, index) => ({
		id: index,
		name,
		handle: "",
		status: "confirmed",
		avatar: name
			.split(" ")
			.map((part) => part[0])
			.join("")
			.slice(0, 2)
			.toUpperCase(),
		color: ["coral", "mint", "gold", "lilac", "sky"][index % 5],
		joined: "",
	}));
}

export async function fetchMessageDetails(rsvpUrl) {
	const response = await fetch(
		`/api/eventMessage?url=${encodeURIComponent(rsvpUrl)}`,
	);
	if (!response.ok) {
		throw new Error(
			"Could not load event details. Check the link and try again.",
		);
	}
	const text = await response.text();
	return parseEventDetails(text);
}

export async function fetchEventDetails(rsvpUrl) {
	const response = await fetch(`/api/event?url=${encodeURIComponent(rsvpUrl)}`);
	if (!response.ok) {
		throw new Error(
			"Could not load event details. Check the link and try again.",
		);
	}
	const data = await response.json(); // Parse as JSON
	return data;
}

function parseEventDetails(text) {
	const lines = text
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line);
	const eventData = {
		rawText: text,
		lines: lines,
	};

	// Parse basic event info
	if (lines.length > 0) {
		eventData.date = lines[0]; // Sept 5, 2026
		eventData.courts = lines[1]; // 4 Courts
		eventData.maxPlayers = lines[2]; // Max of 30 players (ONLY)
		eventData.time = lines[3]; // ⏰ 5 PM - 8 PM
		eventData.location = lines[4]; // 📍 Smash Bro Recreation Center
	}

	// Extract players from the numbered list
	const playerLines = lines.filter((line) => /^\d+\.\s+/.test(line));
	eventData.players = playerLines
		.map((line) => line.replace(/^\d+\.\s+/, ""))
		.filter((name) => name.length > 0);

	return eventData;
}
