# API Integration Guide

## Base URL

Semua request API harus diarahkan ke base URL yang terpusat melalui `shared/http/baseUrl.js`:

- `API_BASE_URL` akan membaca `window.__API_BASE_URL__` (atau fallback `window.__API_BASE__`) jika tersedia.
- Jika tidak ada, default ke `https://api.assistenku.com`.

## Token

Gunakan Firebase ID token atau token sesi yang tersimpan di `localStorage`.
Modul `shared/http/httpClient.js` menyediakan helper `requestWithSession` untuk menambahkan token, `x-admin-code`, `x-doc-number`, dan `x-device-id` secara otomatis.

## Contoh whoami

```js
import { endpoints } from "/shared/http/endpoints.js";
import { request } from "/shared/http/httpClient.js";
import { loadPortalSession } from "/shared/session.js";

const session = loadPortalSession();
const whoami = await request(endpoints.auth.whoami, { token: session?.idToken });
console.log(whoami);
