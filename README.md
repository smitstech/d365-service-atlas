# D365 Service Atlas

A Chrome side-panel extension for browsing and inspecting **Microsoft Dynamics 365 Finance & Operations** service groups, services, operations, and types — without leaving the browser tab you're already signed into.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-green.svg)](extension/manifest.json)
[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/ggipaipokgbkehihhigmoeidolglkcfb?label=Chrome%20Web%20Store)](https://chromewebstore.google.com/detail/d365-service-atlas/ggipaipokgbkehihhigmoeidolglkcfb)

> **Now on the Chrome Web Store** — [install D365 Service Atlas](https://chromewebstore.google.com/detail/d365-service-atlas/ggipaipokgbkehihhigmoeidolglkcfb) directly, or load unpacked from this repo if you prefer.

## What it does

When you open the side panel on a Dynamics 365 F&O tab (`*.operations.dynamics.com` for production / standard sandboxes, or `*.axcloud.dynamics.com` for Cloud Hosted Environments), the extension reads the environment from the URL and uses your existing browser session to:

- List every **service group** exposed by that environment.
- Drill into a group to see its **services and operations** (`POST /api/services/<group>/<service>/<op>`).
- Render request and response **schemas** for each operation.
- Show an auto-generated **example request body** as JSON.
- Copy ready-to-paste **`curl` or `fetch` snippets** for any operation.
- Export an entire service group as an **OpenAPI 3.0** document.
- **Search** across service groups, operations, enums, and complex types once the index has built — jump straight to a type's page from the results.

Everything runs locally in your browser. No data is ever sent to a third party — see [PRIVACY.md](PRIVACY.md).

## Installation

### From the Chrome Web Store

[**Install D365 Service Atlas from the Chrome Web Store**](https://chromewebstore.google.com/detail/d365-service-atlas/ggipaipokgbkehihhigmoeidolglkcfb) — recommended for most users.

### Unpacked (development or pre-release use)

1. Clone or [download a release zip](https://github.com/smitstech/d365-service-atlas/releases).
2. Open `chrome://extensions` in Chrome / Edge / any Chromium-based browser.
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** and select the `extension/` folder (or unzip the release and pick that folder).

The D365 Service Atlas icon will appear in your toolbar. Pin it for easy access.

## Usage

1. Open any Dynamics 365 F&O tab (`*.operations.dynamics.com` or `*.axcloud.dynamics.com`) and sign in normally.
2. Click the **D365 Service Atlas** icon — the side panel opens.
3. The list of service groups loads automatically. Click one to drill in, or start typing to search.
4. From an operation page, use the **curl** / **fetch** buttons in the header to copy a ready-to-run snippet, or use **↓ OpenAPI** on a service-group page to download the whole group as OpenAPI 3.0 JSON.

The extension only activates on Dynamics 365 F&O tabs and uses your existing logged-in session — there is no additional sign-in step.

## Permissions

| Permission                                              | Why it's needed                                                                                                                              |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `activeTab`                                             | Read the active tab's URL to detect which D365 environment you're on.                                                                        |
| `sidePanel`                                             | Render the extension UI in Chrome's side panel.                                                                                              |
| `host_permissions: https://*.operations.dynamics.com/*` | Fetch the service catalog and service metadata from production / standard sandbox D365 F&O environments using your existing session cookies. |
| `host_permissions: https://*.axcloud.dynamics.com/*`    | Same as above, for Cloud Hosted Environments (Tier-2+ developer / sandbox boxes provisioned through Lifecycle Services).                     |

The extension makes **no other network requests** — no telemetry, no analytics, no third-party services.

## Development

### Repository layout

```
.
├── extension/              ← The unpacked Chrome extension. This is what gets zipped for the Web Store.
│   ├── manifest.json
│   ├── background.js       ← Service worker; opens the side panel on action click.
│   ├── panel.html / panel.js ← Side-panel UI shell and routing.
│   ├── api.js              ← Environment detection + authenticated fetch.
│   ├── wsdl-parser.js      ← Parses the service group metadata into an in-memory schema model.
│   ├── openapi.js          ← Schema model → OpenAPI 3.0 document.
│   ├── schema-view.js      ← Renders schemas in the side panel.
│   ├── operation-view.js   ← Operation detail page.
│   ├── type-view.js        ← Type detail page.
│   ├── swagger-view.js     ← Service-group overview page.
│   ├── error-view.js       ← Error rendering.
│   ├── snippets.js         ← curl / fetch snippet generation.
│   ├── json-example.js     ← Auto-generated example request bodies.
│   └── icons/              ← Toolbar and Web Store icons.
├── .github/                ← Issue / PR templates and CI/release workflows.
├── eslint.config.mjs       ← ESLint flat config.
├── .prettierrc.json        ← Prettier config.
├── .prettierignore
├── package.json            ← Dev tooling only (no runtime deps).
├── CHANGELOG.md
├── CODE_OF_CONDUCT.md
├── CONTRIBUTING.md
├── LICENSE
├── PRIVACY.md
├── README.md
└── SECURITY.md
```

The extension itself has no runtime build step — it's plain ES modules loaded straight by Chrome. Edit a file, click **Reload** in `chrome://extensions`, reopen the side panel. The only npm dependencies are dev tooling (ESLint + Prettier) used for `npm run lint` / `npm run format`.

### Running locally

```bash
git clone https://github.com/smitstech/d365-service-atlas.git
cd d365-service-atlas
# Then in Chrome: chrome://extensions → Load unpacked → select extension/
```

### Releasing

Releases are produced by GitHub Actions when a `v*` tag is pushed. The tag must match `extension/manifest.json`'s `version` field exactly (without the `v` prefix).

```bash
# Bump extension/manifest.json's "version" first, commit, then:
git tag v1.0.0.0
git push origin v1.0.0.0
```

The [release workflow](.github/workflows/release.yml) zips `extension/` into `d365-service-atlas-<version>.zip`, attaches it to a GitHub Release, and uploads it as a workflow artifact. Upload that zip to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) to publish.

## Contributing

Issues, ideas, and PRs welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for the workflow, and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for community expectations.

## Security

Found something that looks like a security issue? Please **don't open a public issue.** See [SECURITY.md](SECURITY.md) for the disclosure process.

## License

[MIT](LICENSE) © Smits Technologies.

> Microsoft, Dynamics 365, and Finance & Operations are trademarks of Microsoft Corporation. This project is not affiliated with or endorsed by Microsoft.
