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

## Pull requests and email notifications

All data changes generate a PR with an old/new comparison and source link. Official IRS-derived data with every federal tax bracket and deduction changing by at most 10% is **eligible for automatic squash merge in staging**, after source and data validation. Data from other sources, or larger changes, remains a draft PR for review.

- New PRs mention `@mooyoungoh` in their description.
- Auto-merged IRS PRs post a merge notification comment mentioning `@mooyoungoh`.
- Manual merges of data-review PRs are handled by `.github/workflows/notify-data-merge.yml`, which posts a mention after merge.
- PR and merge history remains available on GitHub. **No data PR ever auto-deploys to the production organization.**

To receive emails: in https://github.com/settings/notifications enable **Participating → Email** and **Watching → Email**, then choose **Watch → Custom → Pull Requests** on this repository. GitHub, not this repository, delivers email. Email receipt cannot be guaranteed until account settings are enabled and a real PR cycle is tested.

## GitHub Actions prerequisites

Repository **Settings → Actions → General → Workflow permissions** must allow GitHub Actions to create and approve pull requests; the individual workflows also request appropriate `contents`, `pull-requests` and `issues` permissions. Branch protection or approval-required automated PR workflows may prevent immediate auto-merging. Review Action run logs if a proposed PR is not created or merged.

## Unfinished

- US income percentile and WID automatic numeric collection (the existing monitor only detects possible announcements).
- Tax logic outside the versioned federal brackets, including state taxes and other embedded yearly assumptions.
- Real end-to-end automated PR creation and merge test; synthetic validation is not a substitute.
- Browser regression comparison of next-year data before promoting it to production.
