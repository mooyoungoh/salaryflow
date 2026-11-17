# Salary Flow data review: world 2025

@mooyoungoh — New reference-data PR. Please review the report below. GitHub email notifications depend on your notification settings.

Every candidate creates a PR and leaves a history trail. Passing numeric checks alone does not prove source accuracy.

- Source: https://wid.world/data/
- Retrieval method: WID official country bulk CSV; tptinc992j for equal-split adults aged 20+, p25/p50/p75/p90/p95/p99 thresholds; multiplied constant-price LCU thresholds by yearly WID price index inyixx999i to obtain nominal year LCU; all nine countries required
- Previous year: 2024
- Candidate year: 2025
- Compared values: 54
- Values unchanged: 0
- Changes above 25%: 0
- Maximum absolute change: 21.17%
- Automatic merge decision: **ELIGIBLE (verified source and within 25% per field)**

## Ten largest changes

| Field | Previous | Candidate | Change |
|---|---:|---:|---:|
| IT.p0 | 17682 | 13939 | -21.17% |
| GB.p5 | 238788 | 271094 | 13.53% |
| ES.p3 | 57819 | 65194 | 12.76% |
| IT.p5 | 171078 | 190291 | 11.23% |
| IT.p2 | 45044 | 48155 | 6.91% |
| ES.p2 | 40634 | 43368 | 6.73% |
| IT.p3 | 65922 | 70354 | 6.72% |
| ES.p4 | 78634 | 83404 | 6.07% |
| ES.p0 | 17964 | 17229 | -4.09% |
| IT.p4 | 90977 | 87297 | -4.04% |

## Reviewer checklist

- [ ] Compare values directly against the cited authoritative dataset
- [ ] Confirm age/population and pre-tax income definitions for WID
- [ ] Confirm the same geographic and percentile definitions for US data
- [ ] Verify IRS tax year, filing status and deduction eligibility for taxes
- [ ] Investigate all differences above 25%, including revisions to historical data
- [ ] Verify tax take-home estimates and income rankings on the staging website
- [ ] Verified official-source changes within their configured per-field threshold can auto-merge on staging; exceptional changes require review.
- [ ] Production organization stays unchanged regardless of staging merge.
