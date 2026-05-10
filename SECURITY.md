# Security Policy

## Reporting a vulnerability

If you believe you've found a security issue in D365 Service Atlas, **please do not open a public GitHub issue.**

Instead, email **security@smitstech.com** with:

- A description of the issue and the impact you think it has.
- Steps to reproduce, including the extension version, browser, and OS.
- Any proof-of-concept code or recordings, if relevant.
- Whether you'd like to be credited in the release notes once a fix ships.

You should receive an acknowledgement within **3 business days**. We aim to validate, fix, and ship a release for confirmed issues within **30 days**, depending on severity and complexity. We'll keep you updated as the fix progresses.

## Scope

In scope:

- Code in this repository (`extension/` and supporting tooling).
- The packaged extension distributed via the Chrome Web Store, once published.

Out of scope:

- Issues in Microsoft Dynamics 365 Finance & Operations itself — please report those to Microsoft.
- Issues in browsers or browser extensions other than this one.
- Social engineering of maintainers or contributors.

## Supported versions

Only the latest released version is supported with security updates. If a fix lands, it will ship in the next release.

## Disclosure

We follow coordinated disclosure. Once a fix is released, we'll publish a security advisory describing the issue, the fix, and any mitigations users should take. Reporters are credited unless they prefer to remain anonymous.
