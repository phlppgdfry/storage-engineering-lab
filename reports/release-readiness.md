# Local release-candidate decision

**CONDITIONAL GO for publishing this focused research/reproduction upgrade under the recorded user authorization for the lab branch and reviewable PR.** No known critical correctness issue remains in the reviewed local scope, the core reproduction and managed validation pass, and limitations are disclosed. This is **not** a production deployment, performance certification, upstream merge recommendation or claim of acceptance. See [the milestone log](next-level.md) for current publication and hosted CI status.

## Evidence-based matrix

| Perspective | Result | Supporting evidence / practical limit |
|---|---|---|
| New developer | PASS WITH LIMITATIONS | A fresh local export executed check, tests, doctor and real native reproduction. [Guide](../docs/reproduction.md) pins source and explains prerequisites; [export](../evidence/prelaunch/fresh-export.json). It reused metadata-verified host dependencies; a separate fresh Docker build verified Linux installation. No public RC clone exists yet. |
| Supabase maintainer | PASS WITH LIMITATIONS | Same small two-file patch, exact regression red/green, real xattrs, Linux suite/build and PostgreSQL/HTTP checks. [Quality gates](quality-gates.md). Draft remains unmerged with CI approval pending; human review and performance attribution remain open. |
| Staff engineer | PASS WITH LIMITATIONS | Owned resources, fixture isolation, pinned tree reconstruction, controlled process/error cleanup and 36 targeted fast tests. [Separate review](prelaunch-final-review.md) independently tests failure paths. Docker daemon/source are trusted; complete OS/security/platform validation is not claimed. |
| Research reviewer | PASS WITH LIMITATIONS |130groups plus manifests/arithmetic checked, raw data and failures retained, unsupported causal/equivalence claims rejected. [Performance-final](performance-final.md). Normal-upload measurements remain inconclusive, including an unfavorable repeatable observation. |
| Open-source user | PASS WITH LIMITATIONS | Focused CLI-first utility, reader paths, troubleshooting, contributing/security guidance, no unnecessary service/UI/framework. [README](../README.md). It requires Node24/native build tooling or local Docker; known upstream advisories restrict use to isolated research. |

No required local gate has an unexplained failure. Failed development attempts remain documented, with targeted fixes and real successful retries; the exact record is in [quality gates](quality-gates.md). Documentation does not substitute for functional validation.

## What is ready

The lab is ready to be reviewed as a local publication candidate. The upstream fix is technically ready for **maintainer review within its documented functional scope**; no new blocking production-code defect was established by the source/agent reviews. Do not mark it accepted, CI-green or performance-cleared.

The defensible differentiator is a small Supabase cancellation investigation with a real native oracle, minimal patch and inspectable evidence. No universal storage platform, novelty guarantee, hosted-impact claim or hiring seniority is warranted. A graphical UI/adaptive agent/release package would add maintenance without demonstrated benefit, so none was built.

## Exact remaining actions

1. Publish the reviewed reproducibility candidate to the authorized lab branch and own-repository PR; keep the upstream patch separate. Authorization was restored from the local handoff on 2026-10-29.
2. After an approved push, observe the proposed GitHub fast workflow. Local command passes are not a hosted workflow pass. Verify the live PR status and every launch statement at publication time.
3. Keep PR 1616 draft/underreview unless separately authorized to update it. Upstream CI approval and human maintainer feedback are external steps; do not contact reviewers for publicity.
4. Preserve the performance uncertainty and dependency/security limits in any announcement. If claiming no regression or speed/cost improvement later, first obtain controlled identical-code stability and a predeclared analysis for the exact workload. That claim is currently NO-GO.
5. Use only the prepared factual launch/demo material after content/destination approval. Do not publish raw ignored logs wholesale or deploy these fixtures as production infrastructure.

Publication approval is an explicit user boundary. No new external write is required to inspect this candidate locally.

## 2026-10-29 disposition

Authorized lab update is published in own-repository PR #1 with actual fast CI passes; PR is open, not merged. The current local research extension is experimental and **not published**. Its separate [gate matrix](next-level.md) documents 43 passing lab tests, native download observations, equal synthetic planner scores and unresolved HTTP/performance/containment boundaries. No upstream source change, status transition, maintainer outreach, release or Storage Doctor change was performed.
