import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
	server: {
		proxy: {
			"/api/event": {
				target: "http://localhost:8080",
				changeOrigin: true,
			},
		},
	},
	plugins: [
		vue(),
		{
			name: "reclub-rsvp-proxy",
			configureServer(server) {
				server.middlewares.use("/api/reclub", async (request, response) => {
					try {
						const requestUrl = new URL(request.url, "http://localhost");
						const targetUrl = new URL(requestUrl.searchParams.get("url"));
						if (
							targetUrl.protocol !== "https:" ||
							!/(^|\.)reclub\.co$/i.test(targetUrl.hostname)
						) {
							response.statusCode = 400;
							response.end("Only https://reclub.co RSVP links are supported.");
							return;
						}

						const upstream = await fetch(targetUrl, {
							headers: { "user-agent": "Reclub-Messenger RSVP reader" },
						});
						response.statusCode = upstream.status;
						response.setHeader(
							"content-type",
							upstream.headers.get("content-type") || "text/html",
						);
						response.end(await upstream.text());
					} catch {
						response.statusCode = 400;
						response.end("A valid RSVP link is required.");
					}
				});
			},
		},
	],
});
