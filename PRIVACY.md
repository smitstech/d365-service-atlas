# Privacy Policy

**Effective date:** 2026-05-10

D365 Service Atlas is a Chrome extension that helps developers browse and inspect Microsoft Dynamics 365 Finance & Operations service metadata. This document describes what data the extension touches and what it does (and does not) do with it.

## Summary

- The extension does **not** collect personal data.
- The extension does **not** send any data to servers operated by Smits Technologies or any third party.
- All network requests are made from your browser, with your existing session, directly to the Dynamics 365 Finance & Operations environment you are signed into.
- There is no analytics, telemetry, or tracking of any kind.

## What the extension accesses

| Data                                                                                            | Why                                                                                                                        | Where it goes                                                                                                                                                                       |
| ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The URL of your active tab                                                                      | To detect which Dynamics 365 environment you're on (e.g. `myenv.operations.dynamics.com` or `myenv.axcloud.dynamics.com`). | Stays in the browser. Used only to construct API URLs.                                                                                                                              |
| Your authenticated session cookies for `*.operations.dynamics.com` and `*.axcloud.dynamics.com` | To make requests to the service catalog and service metadata endpoints on your behalf.                                     | Sent only to your own D365 environment, exactly as your browser would when you visit pages in that tab.                                                                             |
| Service catalog and service metadata fetched from your D365 environment                         | To render the UI (service groups, operations, schemas, etc.).                                                              | Held in memory in the extension while the side panel is open. Cached for the duration of the side-panel session and discarded when the panel is closed or the browser is restarted. |
| Files you download (OpenAPI JSON exports)                                                       | Generated locally from the metadata above when you click the export button.                                                | Saved to your computer via the standard browser download flow. Not transmitted anywhere.                                                                                            |

## What the extension does not do

- It does not read or modify pages on `*.operations.dynamics.com`, `*.axcloud.dynamics.com`, or any other site.
- It does not store browsing history.
- It does not record what you click, search, or copy inside the extension.
- It does not contact any server other than the Dynamics 365 environment you are already signed into.
- It does not include third-party scripts, SDKs, or analytics.

## Permissions

The extension requests these Chrome permissions:

- **`activeTab`** — to read the URL of the currently focused tab so it can detect your D365 environment.
- **`sidePanel`** — to render its UI in Chrome's side panel.
- **`host_permissions: https://*.operations.dynamics.com/*`** — to fetch the service catalog and service metadata from production / standard sandbox D365 F&O environments using your existing session cookies.
- **`host_permissions: https://*.axcloud.dynamics.com/*`** — same as above, for Cloud Hosted Environments (Tier-2+ developer / sandbox boxes provisioned through Lifecycle Services).

No other permissions are requested.

## Open source

The full source code is available at <https://github.com/smitstech/d365-service-atlas>. You can verify any of the above by reading the code.

## Changes to this policy

If this policy changes, the updated version will be committed to the repository with a new effective date. For material changes, the extension's release notes will call out the change.

## Contact

Questions about privacy can be sent to **privacy@smitstech.com**.
