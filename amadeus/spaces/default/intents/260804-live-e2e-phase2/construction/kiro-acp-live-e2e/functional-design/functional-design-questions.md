# Functional Design Questions — kiro-acp-live-e2e

## E-OC1 confirmed derivation

新規質問は0件である。上流の [unit-of-work.md](../../../inception/units-generation/unit-of-work.md)、[unit-of-work-story-map.md](../../../inception/units-generation/unit-of-work-story-map.md)、[requirements.md](../../../inception/requirements-analysis/requirements.md)、[components.md](../../../inception/application-design/components.md)、[component-methods.md](../../../inception/application-design/component-methods.md)、[services.md](../../../inception/application-design/services.md) と、Kiro TUI Functional Design Q1のユーザー裁定 `2026-08-04T12:58:24Z` から機械導出する。

## Applied decisions

- ACPはdirect connectedまたはACP自身のqualified follow-up Issueで完了する。
- retryはanchor確立前のclosed transient setだけ、最大1回、前attemptのcancel/reap/cleanup完了後に限る。
- 中間attemptはPASS receiptを持たず、最終ledgerにbounded summaryだけを残す。
- 実行＋cleanup失敗は実行をprimary、cleanupをsecondaryとして保持し、`cleanup-failed` safety overrideでPASS/greenを禁止する。
- ACP固有の未確定事項はruntime probeで裁定し、要件や共通contractを対話で緩和しない。

## Question result

質問0件。ACP固有のJSON-RPC request相関、structured tool anchor、cancel、descendant reapを成果物で具体化する。
