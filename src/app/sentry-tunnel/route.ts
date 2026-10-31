// Relais des événements navigateur vers Sentry : contourne les bloqueurs et ne
// transmet pas les en-têtes du visiteur (cookies, IP) — seul le payload part.
export { POST } from "@sentry/nextjs/tunnel";
