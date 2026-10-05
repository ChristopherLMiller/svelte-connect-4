/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
/// <reference types="@sveltejs/kit" />
import { build, files, prerendered, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;

const SHELL = `arcade-shell-${version}`;
const RUNTIME = 'arcade-runtime';

// Share cards are for link previews, never shown in the app.
const ASSETS = [...build, ...files.filter((file) => !/og\.png$/.test(file)), ...prerendered];
const PRECACHED = new Set(ASSETS);

sw.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(SHELL)
			.then((cache) => cache.addAll(ASSETS))
			.then(() => sw.skipWaiting())
	);
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(
					keys.filter((key) => key !== SHELL && key !== RUNTIME).map((key) => caches.delete(key))
				)
			)
			.then(() => sw.clients.claim())
	);
});

async function fromShell(request: Request) {
	const cache = await caches.open(SHELL);
	return (await cache.match(request)) ?? fetch(request);
}

async function page(request: Request, url: URL) {
	try {
		const response = await fetch(request);
		if (response.ok) return response;
		throw new Error(`${response.status}`);
	} catch {
		const cache = await caches.open(SHELL);
		return (
			(await cache.match(url.pathname)) ??
			(await cache.match(url.pathname.replace(/\/$/, ''))) ??
			(await cache.match('/')) ??
			Response.error()
		);
	}
}

async function fonts(request: Request) {
	const cache = await caches.open(RUNTIME);
	const hit = await cache.match(request);
	const refresh = fetch(request)
		.then((response) => {
			if (response.ok || response.type === 'opaque') cache.put(request, response.clone());
			return response;
		})
		.catch(() => hit ?? Response.error());
	return hit ?? refresh;
}

sw.addEventListener('fetch', (event) => {
	const { request } = event;
	if (request.method !== 'GET') return;
	const url = new URL(request.url);

	if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
		event.respondWith(fonts(request));
		return;
	}
	if (url.origin !== sw.location.origin) return;

	if (request.mode === 'navigate') {
		event.respondWith(page(request, url));
		return;
	}
	if (PRECACHED.has(url.pathname)) event.respondWith(fromShell(request));
});
