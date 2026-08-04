# Unit of Work — live E2E Phase 2

## 入力と分解原則

Unitは [components.md](../application-design/components.md)、[component-methods.md](../application-design/component-methods.md)、[services.md](../application-design/services.md)、[component-dependency.md](../application-design/component-dependency.md)、[decisions.md](../application-design/decisions.md)、[requirements.md](../requirements-analysis/requirements.md) から生成した。

分解単位はtransport別vertical sliceとする。adapter、既存journey移行、決定的test、liveまたはfollow-up evidence、registry/matrix行を同じUnitに含め、adapter slotやprobe-only成果物を先行着地させない。共通kernelは既存再利用面であり、新規Unitにしない。

規模は既存adapter/driver/testの実測構造に基づく変更行数の推定レンジで、受け入れ基準には使わない。詳細設計後に更新する。

## Unit一覧

| Unit | kind | 複雑度 | 推定変更行数 | deployment |
|---|---|---:|---:|---|
| `kimi-print-live-e2e` | `library` | M | 350〜550行 | test harnessへembedded |
| `kiro-acp-live-e2e` | `library` | L | 500〜850行 | test harnessへembedded、またはfollow-up-linked registry表現 |
| `kiro-tui-live-e2e` | `library` | L | 550〜900行 | test harnessへembedded、またはfollow-up-linked registry表現 |
| `phase2-live-e2e-evidence` | `spec` | S | 100〜250行 | repo内matrix/ledger/runbookとしてin-place消費 |

## U1: `kimi-print-live-e2e`

- **kind:** `library`
- **目的:** Kimi printを共通policy/lifecycleへ接続し、旧live pathを残さずlocal green receiptまで閉じる。
- **所有:** `KimiPrintAdapter`、Kimi固有allocator/credential binding、Kimi journey、adapter/contract tests、`kimi-print` registry行。
- **境界内:** 既存`kimi-print-drive.ts`から`kimi -p`、config、credential symlink mechanicsを再利用し、ambient env/旧skip/旧cleanupを除去する。
- **境界外:** Kiro、共通contractの緩和、Kimi配布manifestの無関係な再設計。
- **受け入れ:** FR-02〜FR-08、FR-16〜FR-20、NFR-01〜NFR-08の該当caseがgreenで、Kimi自身のlocal live receiptが存在する。
- **再利用inventory:** `LiveAdapter`、`runLiveJourney`、`buildChildEnvironment`、`ResourceRegistrar`、ledger/projector、既存Kimi driver/serial tests。
- **Construction適用:** Functional Design、NFR Design、Code Generation、Build and Test。

## U2: `kiro-acp-live-e2e`

- **kind:** `library`
- **目的:** ACPを独立probeし、直接接続または検証可能なfollow-up Issueまで同一Unitで完了する。
- **所有:** ACP auth/config/process probe、`KiroAcpAdapter`、JSON-RPC mechanics port、ACP journey/tests、`kiro-acp` registry/matrix行、必要時のfollow-up evidence。
- **直接接続branch:** safe binding、allowlisted env、structured anchor、abort/cancel後のdescendant reap、contract/integration/live greenを全て成立させる。
- **follow-up branch:** sanitized blocker evidence、推奨seam、再開条件、検証可能なACをIssue化し、registryを`unsupported`または`unverified`＋linkで閉じる。
- **境界外:** TUIの能力推定、ambient HOME許可、ACP greenのTUIへの継承。
- **受け入れ:** FR-09〜FR-20とNFRのACP面をconnectedまたはfollow-up-linkedで満たし、measured-onlyを残さない。
- **再利用inventory:** `driveKiroAcp`/`AcpSession`、Claude SDK adapterのprocess reap、common adapter/contract/testing support。
- **Construction適用:** Functional Design、NFR Design、Code Generation、Build and Test。

## U3: `kiro-tui-live-e2e`

- **kind:** `library`
- **目的:** TUIを独立probeし、直接接続または検証可能なfollow-up Issueまで同一Unitで完了する。
- **所有:** TUI auth/config/tmux probe、`KiroTuiAdapter`、run-private tmux mechanics、disk/state anchor、bounded pane evidence、TUI journey/tests、`kiro-tui` registry/matrix行、必要時のfollow-up evidence。
- **直接接続branch:** scratch home/env、private socket/session、deterministic disk/state anchor、timeout/abort時kill、contract/integration/live greenを全て成立させる。
- **follow-up branch:** sanitized blocker evidence、推奨seam、再開条件、検証可能なACをIssue化し、registryを`unsupported`または`unverified`＋linkで閉じる。
- **境界外:** ACPの能力推定、pane全文の永続化、共有tmux server。
- **受け入れ:** FR-09〜FR-20とNFRのTUI面をconnectedまたはfollow-up-linkedで満たし、measured-onlyを残さない。
- **再利用inventory:** `tui-drive.ts`/`tui-client.ts`、`ClaudeTuiAdapter`のprivate tmux port、common resource/contract/testing support。
- **Construction適用:** Functional Design、NFR Design、Code Generation、Build and Test。

## U4: `phase2-live-e2e-evidence`

- **kind:** `spec`
- **目的:** 3 transportの完了結果を統合し、Phase 2全体の追跡性と運用契約を閉じる。
- **所有:** final capability matrix、ledger整合check、最終green SHAまたはfollow-up Issue link、保守者runbook、既存Codex/Claude/Pi回帰証拠。
- **境界内:** U1〜U3が出したregistry/receipt/Issueを投影し、FR-01/21/22とNFR-05/07/08を横断検証する。
- **境界外:** adapter実装、transport probe、追加live journey、Issue #1717 Phase 3。
- **受け入れ:** Kimi/ACP/TUI全行がsupported＋自身のgreen SHAまたはfollow-up-linkedとなり、matrix checkとsource-only/build回帰がgreenである。
- **再利用inventory:** `project-matrix.ts`、`projector.ts`、`latestGreenByAdapter`、existing capability documentation/runbook。
- **Construction適用:** Functional Design、NFR Design、Code Generation（projection/doc/checkの必要最小変更）、Build and Test。

## 共有制約

- `kind`は上記で固定し、Construction中に無申告で変更しない。
- 各library Unitは実装と配線を同時に着地させ、dormant interfaceや未使用adapterを残さない。
- Unit間の共有file変更は契約上の依存を意味しない。実際の並行編集可否とBolt編成はDelivery Planningで判断する。
- follow-up branchは失敗ではなくRequirementsで許可された明示成果であるが、Issue linkなしでは完了しない。


## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-04T12:24:45Z
- **Iteration:** 1
- **Scope decision:** none

4 Unitはいずれもcanonical kind、境界、責務、配置形態、規模、実装制約を備え、3つのtransport Unitを既存kernel上の独立した縦切りとして扱うDAGは循環せず、証跡spec Unitへの収束も妥当です。Kiroの直接実装／qualified follow-up分岐は上流の安全条件と整合し、transport間でproofを共有しません。全FR/NFRのcoverage、reuse inventory、数値規模、cleanup失敗時のPASS禁止も確認でき、実装を妨げる欠落はありません。

### Findings

- FOLLOW-UP | Kiro 2 Unitの500–850行／550–900行という見積りは直接実装分岐には有用ですが、follow-up分岐では成果物規模が大幅に異なるため、Delivery Planningで分岐別見積りとして再計算すると計画精度が上がります。
- NIT | story-mapのFR09–15はACP/TUIへの分割とだけ要約されているため、最終文書では各FRの担当transportを個別に表示すると追跡性がより明瞭になります。
