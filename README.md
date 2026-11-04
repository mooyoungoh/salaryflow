# Salary Flow — staging

Staging URL: https://mooyoungoh.github.io/salaryflow/

Production is maintained separately at https://salaryflow.github.io/. **Do not copy experimental datasets to the production organization without validating staging.**

## Reference data

- `data/manifest.json` selects the active tax, US income and WID JSON versions.
- `node scripts/validate-data.mjs` checks structure and tax calculation regression samples.
- `node scripts/test-data-pipeline.mjs` validates safe/unsafe auto-merge decisions using isolated synthetic data.
- `node scripts/test-irs-parser.mjs` checks IRS parser fixtures.
- `node scripts/test-irs-live.mjs` checks the current IRS data against the saved 2026 federal reference.
- `node scripts/discover-irs-tax.mjs` scans official IRS bulletins for complete next-year tax tables.
- `node scripts/collect-wid.mjs` downloads nine official WID country CSVs and validates the six income thresholds per country. It converts constant-price local-currency amounts with annual WID price indices and skips unpublished years.
- `node scripts/collect-dqydj.mjs` parses the official DQYDJ *individual*, not household, income summary table for all 50 states and DC, plus US national percentiles. It verifies the income year, edition year and four thresholds against the active dataset.
- `node scripts/test-dqydj-parser.mjs` and `.github/workflows/validate-dqydj.yml` test the parser with synthetic tables and the official live source.

## Browser reference-data recovery

- The 2026 IRS, 2026 edition / 2025 income US, and 2024 WID datasets are embedded directly in `index.html` as a **permanent baseline**, independent of JSON and the manifest.
- On startup, each data type independently tries the active JSON (8-second timeout), validates its structure, and saves validated results to localStorage.
- If a manifest or data file is unavailable, malformed or stale, the UI uses the last validated browser cache, otherwise its embedded fixed baseline. The salary counter remains operational; a small banner explains that reference statistics may be outdated.
- This fallback is deliberately not live data; it protects availability, not tax estimates against law changes. The production organization is unchanged until reviewed deployment.
- `node scripts/test-reference-fallback.mjs` tests offline/corrupted/missing dataset cases and cached-recovery behavior.

## Pull requests and email notifications

New-year data updates are proposed through PRs with old/new comparisons and source links. Official-source IRS changes within 10%, plus DQYDJ and WID changes within 25% per reference value, can **automatically squash-merge on staging** after validation. Untrusted, malformed or anomalous data is blocked or held as a draft PR.

- New PRs mention `@mooyoungoh` in their description.
- Auto-merged IRS, WID and DQYDJ PRs post a merge notification comment mentioning `@mooyoungoh`.
- Manual merges of data-review PRs are handled by `.github/workflows/notify-data-merge.yml`, which posts a mention after merge.
- PR and merge history remains available on GitHub. **No data PR ever auto-deploys to the production organization.**

To receive emails: in https://github.com/settings/notifications enable **Participating → Email** and **Watching → Email**, then choose **Watch → Custom → Pull Requests** on this repository. GitHub, not this repository, delivers email. The PR and merge notification smoke test succeeded on PR #1; the repository owner confirmed receipt of both emails.

## GitHub Actions prerequisites

Repository **Settings → Actions → General → Workflow permissions** must allow GitHub Actions to create and approve pull requests; the individual workflows also request appropriate `contents`, `pull-requests` and `issues` permissions. Branch protection or approval-required automated PR workflows may prevent immediate auto-merging. Review Action run logs if a proposed PR is not created or merged.

## Unfinished

- DQYDJ and WID collectors run monthly and open PRs for complete newer editions. Valid official-source deltas within 25% per reference value can auto-merge on staging, otherwise a draft PR remains. Test the first real release-triggered PR before relying on it.
- DQYDJ may revise a current-edition source in place; the collector explicitly errors on an unexpected revision, rather than silently replacing data.
- WID methodology, source revisions and nominal local-currency conversions remain potential accuracy risks; the 25% threshold and structural checks cannot independently prove the source definitions are unchanged.
- Tax logic outside the versioned federal brackets, including state taxes and other embedded yearly assumptions.
- IRS auto-merge was smoke-tested with an isolated no-data PR (#1); the complete future IRS, DQYDJ and WID data-release paths have not yet been end-to-end tested.
- Browser regression comparison of next-year data before promoting it to production.
