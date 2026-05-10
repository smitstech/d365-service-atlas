# Contributing to D365 Service Atlas

Thanks for your interest! This document covers everything you need to start contributing.

By participating you agree to abide by the [Code of Conduct](CODE_OF_CONDUCT.md).

## Ways to contribute

- **Report a bug** — open a [bug report](https://github.com/smitstech/d365-service-atlas/issues/new?template=bug_report.yml).
- **Request a feature** — open a [feature request](https://github.com/smitstech/d365-service-atlas/issues/new?template=feature_request.yml).
- **Improve docs** — typos, clarifications, missing screenshots, anything.
- **Submit a pull request** — see below.

For security issues, please follow [SECURITY.md](SECURITY.md) instead of opening a public issue.

## Development setup

The extension itself has no runtime build step — it's plain ES modules loaded straight by Chrome. The only npm dependencies are dev tooling (ESLint, Prettier) used for linting and formatting.

1. Fork and clone the repo.
2. `npm install` (only needed if you'll run `npm run lint` / `npm run format`).
3. Open `chrome://extensions` in Chrome (or any Chromium-based browser).
4. Enable **Developer mode**.
5. Click **Load unpacked** and select the `extension/` folder.
6. Open a `*.operations.dynamics.com` tab and click the toolbar icon to open the side panel.

After editing a file, click **Reload** on the extension's card in `chrome://extensions` and reopen the side panel.

### Lint and format

```bash
npm run lint            # check for lint errors
npm run lint:fix        # auto-fix what ESLint can
npm run format          # format the codebase with Prettier
npm run format:check    # check formatting without writing
```

CI runs `npm run lint` and `npm run format:check` on every PR — both must pass.

### Project structure

See the [Repository layout](README.md#repository-layout) section in the README.

## Pull request workflow

1. Create a topic branch off `main` (e.g. `fix/openapi-array-types`, `feat/keyboard-shortcuts`).
2. Make your changes. Keep PRs focused — one logical change per PR is much easier to review.
3. Test the change manually in the side panel against a real D365 environment. UI changes should be verified visually.
4. If you change behavior that's user-visible, add an entry to [CHANGELOG.md](CHANGELOG.md) under `## [Unreleased]`.
5. Open the PR. The PR template will prompt for what's changed and how to test it.
6. CI runs JSON validation and a packaging dry-run on every PR. Fix any failures before requesting review.

## Code style

Formatting is enforced by Prettier and lint rules by ESLint — see [.prettierrc.json](.prettierrc.json) and [eslint.config.mjs](eslint.config.mjs). Run `npm run lint:fix && npm run format` before pushing if anything is off.

Beyond that:

- Plain ES modules, no transpilation. Target evergreen Chromium.
- Prefer small focused functions and keep state local to a module where you can.
- The extension is intentionally **zero runtime dependencies**. Don't add any without strong justification — devDependencies (lint, format, tests) are fine.
- Comments explain _why_, not _what_ — don't restate what the code already shows.

## Commit messages

Short imperative subject lines, ~70 chars, lowercase. Example:

```
add keyboard shortcut to focus search
```

If the change needs context, add a body explaining the _why_ — what behavior was wrong, what user need this addresses.

## Reporting bugs

A good bug report has:

- What you did (which environment, which service group, what you clicked).
- What you expected.
- What happened instead, including any console errors (right-click the side panel → **Inspect** to see them).
- Browser and OS.

The bug report template will prompt you for these.

## Releasing (maintainers only)

Releases are tag-driven via GitHub Actions:

1. Bump the `version` in [extension/manifest.json](extension/manifest.json).
2. Move `## [Unreleased]` entries in [CHANGELOG.md](CHANGELOG.md) under a new `## [<version>] - <date>` heading.
3. Commit and merge to `main`.
4. Tag and push: `git tag v<version> && git push origin v<version>`.
5. The release workflow zips `extension/` and attaches it to the GitHub Release.
6. Upload the resulting zip to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).

## Questions

Open a [GitHub Discussion](https://github.com/smitstech/d365-service-atlas/discussions) (once enabled) or a regular issue tagged `question`.
