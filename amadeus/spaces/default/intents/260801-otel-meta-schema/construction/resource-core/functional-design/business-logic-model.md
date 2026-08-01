# Business Logic Model — U1 resource-core

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md — U1 の責務境界は unit-of-work.md の U1 行(按分 350行)から、API 形は component-methods.md の resource.ts / resource-suppliers.ts 節から、FR 契約は requirements.md FR-RES-1〜4 から、価値文脈は story-map 段1から、store/Relay 境界は services.md から導出した。

## 解決フロー(buildResource)

1. **中立8属性**を順に解決(各解決は独立 try、失敗キーは省略 = fail-open): service.name(定数)/ service.version(amadeus-version)/ telemetry.sdk.language(定数)/ deployment.environment.name(env: GITHUB_ACTIONS or CI → ci、else local)/ host.name(os.hostname)/ amadeus.clone_id(auditCloneId)/ amadeus.operating_mode(env、既定 solo)/ amadeus.harness(detectHarnessType — amadeus-harness.ts:109-119)
2. **vcs 2属性**: git rev-parse --abbrev-ref HEAD / HEAD を subprocess で1回(失敗は両方省略)。**walking skeleton では claude SessionStart hook からの session.id 供給と合わせ、この bag が3ストアへ現れるまでを end-to-end とする**
3. **supplier 供給分を合成**(suppliedResourceAttributes — 中立解決とキー衝突しない設計: 供給4キーは中立8キーと素)
4. memo 化(currentResource)。supplier 供給イベントで memo 無効化(ADR-1 の遅延評価)

## 配布フロー(bootstrap)

ensureOtelBootstrap / ensureTracerBootstrap / meter arm が register 時に currentResource getter をプロバイダへ渡す。プロバイダは record 組み立て時に読む(スナップショット固定をしない)。

## 二層 redaction(FR-RES-4 — export-boundary-redaction Mandate 準拠)

- **write-time 層(新設)**: buildResource が bag 完成時に redactAttributes+credential scrub を1回適用する — span/metrics 経路には write-time redaction が現存しない(実測: tracer-provider / meter-provider に redact 呼出しなし、write-time は logger-provider :78/:119 のみ)ため、**bag の組み立て点で一元的に write-time 層を張る**。これにより3シグナルすべての resource が供給元(hook 供給値含む)を離れた時点で masked になる
- **export 境界層(既存へ追加)**: local-span-exporter の redactRecord へ resource を追加(既存3面と同列)。logs/metrics exporter も record へ resource を載せ redaction を通す。二層は冪等(同一 policy)

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-01T02:59:27Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の Major 3件(閉集合14訂正 / 二層 redaction の write-time 層新設への接地 / frontend-components.md 削除 = E-GSFFD13 準拠)を是正確認し READY。

### Findings

- None
