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

## Pull requests and email notifications

New-year data updates are proposed through PRs with old/new comparisons and source links. Official IRS-derived data with every federal tax bracket and deduction changing by at most 10% is **eligible for automatic squash merge in staging**, after source and data validation. Data from other sources, or larger changes, remains a draft PR for review.

- New PRs mention `@mooyoungoh` in their description.
- Auto-merged IRS PRs post a merge notification comment mentioning `@mooyoungoh`.
- Manual merges of data-review PRs are handled by `.github/workflows/notify-data-merge.yml`, which posts a mention after merge.
- PR and merge history remains available on GitHub. **No data PR ever auto-deploys to the production organization.**

To receive emails: in https://github.com/settings/notifications enable **Participating → Email** and **Watching → Email**, then choose **Watch → Custom → Pull Requests** on this repository. GitHub, not this repository, delivers email. The PR and merge notification smoke test succeeded on PR #1; the repository owner confirmed receipt of both emails.

## GitHub Actions prerequisites

Repository **Settings → Actions → General → Workflow permissions** must allow GitHub Actions to create and approve pull requests; the individual workflows also request appropriate `contents`, `pull-requests` and `issues` permissions. Branch protection or approval-required automated PR workflows may prevent immediate auto-merging. Review Action run logs if a proposed PR is not created or merged.

## Unfinished

- DQYDJ collection and WID collection are both scheduled monthly and propose **draft PRs only** when a complete newer edition is available. Human approval remains required. Test the first actual release-triggered PR before relying on it.
- DQYDJ may revise a current-edition source in place; the collector explicitly errors on an unexpected revision, rather than silently replacing data.
- For WID, verify methodology, source revisions, and nominal local-currency calculations before approving any candidate.
- Tax logic outside the versioned federal brackets, including state taxes and other embedded yearly assumptions.
- IRS auto-merge was smoke-tested with an isolated no-data PR (#1); the complete future IRS, DQYDJ and WID data-release paths have not yet been end-to-end tested.
- Browser regression comparison of next-year data before promoting it to production.
