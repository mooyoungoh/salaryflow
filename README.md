# Salary Flow — staging

Staging URL: https://mooyoungoh.github.io/salaryflow/

Production is maintained separately at https://salaryflow.github.io/. **Do not copy experimental datasets to the production organization without validating staging.**

## US income ranking: Census ACS PUMS (Test only)

The US/state income percentile cards now **refuse to show invented decimals or legacy 4-point logarithmic interpolation**. They load `data/income-census-2024.json` only if it contains all 50 states, DC and US weighted P1–P99 intervals. Until the official file is generated and validated, the cards explicitly display unavailable rather than a made-up number. Existing WID international comparisons remain separate.

Official source: https://www.census.gov/programs-surveys/acs/microdata/access/2024.html (2024 ACS 1-Year PUMS; 2024 is the latest 1-year microdata release currently listed). The reproducible generator is `scripts/build_census_rank.py`. It downloads the **person-level** `csv_pXX.zip` files for all states/DC from Census FTP, filters `AGEP >= 16` and positive `PERNP` earnings, adjusts with `ADJINC / 1,000,000`, and computes survey-weighted empirical percentiles using `PWGTP`. One job can produce the entire public JSON; no key or third-party rankings required.

Published 2024 PUMS dataset verification: 52 jurisdictions, **1,764,845** eligible unweighted person records nationwide, US median positive personal earnings **$46,702**, US P99 **$466,000**. Values are survey-weighted estimates, not tax thresholds or current-year salary predictions.

- Build: `python3 scripts/build_census_rank.py --download --output data/income-census-2024.json`
- Validate: `python3 scripts/validate_census_rank.py`
- Offline tests: `python3 -m unittest scripts/test_build_census_rank.py -v` and `node scripts/test-census-rank.mjs`
- Automation: `.github/workflows/build-census-rank.yml` only targets the isolated Test feature branch and commits the generated file there. **Do not merge without the complete validated generated JSON.**

Methodological limitations: PUMS is a sample, not a census of every worker. Personal earnings (`PERNP`) are not the same as all-source personal income (`PINCP`) or household income. The dataset uses 2024 earnings in 2024 dollars; current pay isn't automatically inflation-adjusted. PUMS top-coding and state sample uncertainty prohibit trustworthy top 0.1% or 0.01% claims. The UI uses explicit *1-percentage-point intervals*, not an assumed precision of tenths.

## International income ranking: verified WID percentile bands (Test)

The international comparison uses the **same WID 2024 equal-split, pretax national income definition for the US and each selected country**. The separate US/state cards use Census ACS PUMS **personal earnings**, so their ranking values are not directly comparable to WID national-income ranks.

The international comparison no longer interpolates decimal ranks from six sparse points. Instead it loads `data/income-world-wid-percentiles-2024.json`, generated from **official** per-country WID bulk CSV files, series `tptinc992j` (age 20+, equal split), price-index series `inyixx999i`, 2024. It displays **honest percentile intervals** (e.g. approx. top 18–19%) between nearest published threshold values. Missing, non-positive, or out-of-order source observations are excluded rather than invented. The verified 2024 dataset contains 95 percentiles for most countries (US 98, Italy 93); no claims are made below the finest available threshold.

- Generate: `node scripts/build-wid-detailed.mjs`
- Validate: `node scripts/validate-wid-detailed.mjs`
- Tests: `node scripts/test-wid-detailed-parser.mjs` and `node scripts/test-wid-bands.mjs`
- If detailed JSON cannot load, only broad ranges between the six published baseline thresholds are shown, never interpolated decimals. Country vs US still both use WID.
- Conversion uses the **current market FX rate**, not contemporaneous 2024 purchasing power parity, so country rankings are illustrative, not a cost-of-living-adjusted comparison.

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

## SSA Social Security / Medicare constants

- The payroll estimate previously hardcoded the 2026 Social Security wage cap ($184,500) and employee payroll tax rates. They now load from `data/payroll-2026.json`, referenced by `data/manifest.json`.
- SSA 2026 payroll figures are embedded in the HTML alongside the 2026 IRS, 2026 US income and 2024 WID safety baselines. Missing or invalid payroll JSON is recovered independently from cached data or the built-in baseline.
- The official SSA 2027 cost-of-living factsheet confirms the next wage cap of $192,300. Its parser and candidate preparation are tested in `scripts/test-ssa-payroll.mjs` and `scripts/test-ssa-pipeline.mjs`.
- The `Propose updated SSA payroll tax cap` monthly workflow checks whether the **active IRS tax year has advanced**. Until then, the displayed payroll calculation retains 2026 values; it cannot adopt the 2027 limit prematurely. On a matching year, an official change within 15% can automatically create and squash-merge a staging PR with notification.
- Arizona's manually configurable state deduction remains unchanged. Other state-tax models are not inferred or silently enabled.

## Arizona 2026 wage-income estimate

- Arizona's enacted HB 4168/SB 1861 (2026-2027 tax omnibus) sets a **2.5% flat income tax rate** and standard deductions of **$15,750** (single/MFS), **$23,625** (head of household), and **$31,500** (married filing jointly). Source: https://www.azleg.gov/legtext/57leg/2R/summary/S.4168-1861ATT_ASENACTED.DOCX.htm and https://azdor.gov/individuals/withholding-tax-individual.
- The AZ reference is `data/arizona-2026.json`, also embedded in the static HTML as the immutable offline baseline. It is validated independently of federal tax, SSA payroll data and income statistics.
- Prior installations that retained the old default $16,100 (copied from federal standard deduction) are migrated to the enacted AZ default. Any custom deduction amount remains untouched; switching filing status automatically updates the default only when not customized. Reset returns to the correct single-filer default.
- This is a **simplified W-2 wage-only estimate**, not a complete state return: Arizona credits, qualified charitable contributions, additional subtractions and special tax situations remain excluded. No additional states with income taxes are modeled.
- The app shows the federal, AZ and SSA payroll tax reference years separately, avoiding claims that old state or SSA reference figures are current.
- `node scripts/test-arizona-tax.mjs` verifies official deductions, state-tax outcomes, zero-wage-income states and custom-value migration; `node scripts/test-inline-script.mjs` catches syntactically invalid inline JavaScript after changes.

## Browser reference-data recovery

- The 2026 IRS, 2026 Arizona state tax, 2026 payroll tax, 2026 edition / 2025 income US, and 2024 WID datasets are embedded directly in `index.html` as a **permanent baseline**, independent of JSON and the manifest.
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
