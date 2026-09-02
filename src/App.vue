<script setup>
import { computed, onMounted, ref } from "vue";
import { fetchConfirmedPlayers, fetchEventDetails } from "./services/reclub.js";

const rsvpUrl = ref(null);
const search = ref("");
const activeFilter = ref("all");
const isLoading = ref(false);
const loaded = ref(true);
const errorMessage = ref("");
const eventDetails = ref(null);
const showEventDetails = ref(false);

const eventDate = computed(() => eventDetails.value?.date || "");
const eventTime = computed(() => eventDetails.value?.time || "");
const eventLocation = computed(() => eventDetails.value?.location || "");
const eventTitle = computed(() => eventDetails.value?.title || "");

const confirmedNames = [];

const players = ref(
	confirmedNames.map((name, index) => ({
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
	})),
);

const confirmed = computed(() =>
	players.value.filter((player) => player.status === "confirmed"),
);
const waitlist = computed(() =>
	players.value.filter((player) => player.status === "waitlist"),
);
const visiblePlayers = computed(() => {
	const query = search.value.trim().toLowerCase();
	return players.value.filter((player) => {
		const matchesFilter =
			activeFilter.value === "all" || player.status === activeFilter.value;
		const matchesSearch =
			!query || `${player.name} ${player.handle}`.toLowerCase().includes(query);
		return matchesFilter && matchesSearch;
	});
});

const formattedEventText = computed(() => {
	if (!eventDetails.value) return "";
	const details = eventDetails.value;
	const playersList = Array(30)
		.fill(null)
		.map((_, i) => {
			const player = details.players?.[i];
			return `${i + 1}. ${player || ""}`;
		})
		.join("\n");

	return `${details.date || ""}
${details.courts || ""}
${details.maxPlayers || ""}
${details.time || ""}
${details.location || ""}

Fee: ₱175 + Shuttlecock Sharing

No show & cancellation within 24 hours without replacement: ₱200 penalty (⚠️ No joy reservations please! ⚠️)

RSVP: ${details.rsvp || rsvpUrl.value}

QM: ${details.qm}
${playersList}`;
});

async function loadPlayers() {
	isLoading.value = true;
	errorMessage.value = "";
	try {
		const fetchedPlayers = await fetchConfirmedPlayers(rsvpUrl.value);
		if (fetchedPlayers) players.value = fetchedPlayers;
		loaded.value = true;
	} catch (error) {
		errorMessage.value = error.message;
	}
	isLoading.value = false;
	// Only load event details if URL exists
	if (rsvpUrl.value) {
		loadEventDetails();
	}
}

async function loadEventDetails() {
	isLoading.value = true;
	errorMessage.value = "";
	showEventDetails.value = false;
	try {
		const details = await fetchEventDetails(rsvpUrl.value);
		eventDetails.value = details;
	} catch (error) {
		errorMessage.value = error.message;
	}
	isLoading.value = false;
}

async function showEvent() {
	isLoading.value = true;
	errorMessage.value = "";
	showEventDetails.value = false;
	try {
		const details = await fetchEventDetails(rsvpUrl.value);
		eventDetails.value = details;
		showEventDetails.value = true;
	} catch (error) {
		errorMessage.value = error.message;
	}
	isLoading.value = false;
}

const eventTextCopied = ref(false);

async function copyFormattedEventText() {
	try {
		await navigator.clipboard.writeText(formattedEventText.value);
	} catch {
		// Clipboard access can be unavailable in local previews.
	}
	eventTextCopied.value = true;
	setTimeout(() => {
		eventTextCopied.value = false;
	}, 1800);
}

function setFilter(filter) {
	activeFilter.value = filter;
}

function openRsvp() {
	window.open(rsvpUrl.value, "_blank", "noopener,noreferrer");
}

onMounted(loadPlayers);
</script>

<template>
	<div class="app-shell">
		<header class="topbar">
			<a class="brand" href="#" aria-label="Reclub home">
				<span class="brand-mark"><span></span><span></span><span></span></span>
				<span><b>LineDrive PH</b></span>
			</a>
			<div class="topbar-actions">
				<span class="sync-status"><i></i> Connected to Reclub</span>
			</div>
		</header>

		<main>
			<section class="hero">
				<div class="eyebrow">
					<span class="eyebrow-dot"></span> MESSAGE AUTOMATION
				</div>
				<h1>Turn your RSVP list<br /><em>into a message.</em></h1>
				<p class="hero-copy">
					Pull confirmed players from any Reclub event and get your group chat
					message ready in seconds.
				</p>

				<form class="link-form" @submit.prevent="loadPlayers">
					<div class="input-wrap">
						<span class="link-icon">↗</span>
						<input
							v-model="rsvpUrl"
							aria-label="Reclub RSVP link"
							placeholder="Paste your Reclub RSVP link"
						/>
					</div>
					<button class="primary-button" type="submit" :disabled="isLoading">
						{{ isLoading ? "Fetching…" : "Fetch players" }} <span>→</span>
					</button>
				</form>
				<div class="button-group" v-if="rsvpUrl">
					<button class="open-link-button" type="button" @click="openRsvp">
						Open RSVP link in new tab ↗
					</button>
					<button
						class="open-link-button"
						type="button"
						@click="showEvent"
						:disabled="isLoading"
					>
						{{ isLoading ? "Loading…" : "Get Event Details" }} ↗
					</button>
				</div>
				<p class="hint">
					<span>⌘</span> Reads the RSVP page and keeps only confirmed player
					names.
				</p>
				<p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
				<div
					v-if="showEventDetails && eventDetails"
					class="event-details-panel"
				>
					<div class="event-details-content" v-if="rsvpUrl">
						<button class="close-button" @click="showEventDetails = false">
							✕
						</button>
						<h2>Event Details</h2>
						<div class="event-info-grid">
							<div v-if="eventDetails.date" class="info-item">
								<span class="label">Date</span>
								<span class="value">{{ eventDetails.date }}</span>
							</div>
							<div v-if="eventDetails.time" class="info-item">
								<span class="label">Time</span>
								<span class="value">{{ eventDetails.time }}</span>
							</div>
							<div v-if="eventDetails.location" class="info-item">
								<span class="label">Location</span>
								<span class="value">{{ eventDetails.location }}</span>
							</div>
							<div v-if="eventDetails.courts" class="info-item">
								<span class="label">Courts</span>
								<span class="value">{{ eventDetails.courts }}</span>
							</div>
							<div v-if="eventDetails.maxPlayers" class="info-item">
								<span class="label">Players</span>
								<span class="value">{{ eventDetails.maxPlayers }}</span>
							</div>
						</div>
						<div
							v-if="eventDetails.players && eventDetails.players.length > 0"
							class="event-players"
						>
							<h3>Confirmed Players ({{ eventDetails.players.length }})</h3>
							<ol class="players-list">
								<li
									v-for="(player, index) in eventDetails.players"
									:key="index"
								>
									{{ player }}
								</li>
							</ol>
						</div>
						<pre v-if="eventDetails.rawText" class="event-raw-text">{{
							eventDetails.rawText
						}}</pre>
						<div class="event-details-footer">
							<button @click="copyFormattedEventText" class="copy-text-button">
								{{ eventTextCopied ? "Copied!" : "Copy Formatted Event Text" }}
								<span>↗</span>
							</button>
						</div>
					</div>
				</div>
			</section>

			<section
				v-if="loaded"
				class="workspace"
				aria-label="Confirmed player roster"
			>
				<div class="event-strip">
					<div class="event-icon">▦</div>
					<div class="event-info">
						<span>EVENT TITLE</span><strong>{{ eventTitle }}</strong>
					</div>
					<div class="event-info">
						<span>Date and Time</span>
						{{ eventDate && eventTime ? eventDate + " " + eventTime : "" }}
					</div>
					<div class="event-info">
						<span>Location</span> {{ eventLocation ? eventLocation : "" }}
					</div>
				</div>

				<div class="workspace-head">
					<div>
						<div class="section-kicker">ATTENDANCE</div>
						<h2>Who’s in?</h2>
					</div>
					<div class="attendance-total">
						<strong>{{ confirmed.length }}</strong
						><span>players<br />confirmed</span>
					</div>
				</div>

				<div class="progress-track">
					<span
						:style="{ width: `${Math.min(100, confirmed.length * 5)}%` }"
					></span>
				</div>
				<div class="roster-tools">
					<div class="filters" role="tablist" aria-label="Filter players">
						<button
							:class="{ selected: activeFilter === 'all' }"
							@click="setFilter('all')"
						>
							Everyone <b>{{ players.length }}</b>
						</button>
						<button
							:class="{ selected: activeFilter === 'confirmed' }"
							@click="setFilter('confirmed')"
						>
							Confirmed <b>{{ confirmed.length }}</b>
						</button>
						<button
							:class="{ selected: activeFilter === 'waitlist' }"
							@click="setFilter('waitlist')"
						>
							Waitlist <b>{{ waitlist.length }}</b>
						</button>
					</div>
					<label class="search-box"
						><span>⌕</span
						><input
							v-model="search"
							placeholder="Find a player"
							aria-label="Find a player"
					/></label>
				</div>

				<div class="player-list">
					<div
						v-for="player in visiblePlayers"
						:key="player.id"
						class="player-row"
					>
						<div class="player-avatar" :class="player.color">
							{{ player.avatar }}
						</div>
						<div class="player-name">
							<strong>{{ player.name }}</strong
							><span>{{ player.handle }}</span>
						</div>
						<span class="player-status" :class="player.status"
							><i></i>{{ player.status }}</span
						>
						<time>{{ player.joined }}</time>
						<button class="more-button" aria-label="More player actions">
							···
						</button>
					</div>
					<div v-if="visiblePlayers.length === 0" class="empty-state">
						No players match that search.
					</div>
				</div>
			</section>
		</main>
		<footer>
			<span>Players List</span>
			<h2>Developed by Jendhel Serrano</h2>
			<span>v0.1</span>
		</footer>
	</div>
</template>
