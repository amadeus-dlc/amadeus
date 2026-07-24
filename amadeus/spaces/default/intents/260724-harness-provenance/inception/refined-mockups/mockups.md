# Mockups — 260724-harness-provenance

上流入力(consumes 全数): wireframes.md, user-flow.md, stories.md, requirements.md, team-practices.md

## N/A(視覚モックアップ)

非UIのため視覚モックアップは N/A。rough-mockups の wireframes.md(System Context Diagram)を interaction-spec.md で詳細化した(user-flow.md の「Interaction Flow: ステージ実行時のハーネス記録」も interaction-spec.md へ引き継いだ)。stories.md の利用シナリオ「実行中のハーネス種別が `amadeus-state.md` に自動記録されてほしい」が求める体験は、視覚 UI ではなく下記の CLI 出力契約(verdict 別文言+exit code)として充足する。team.md の cid:requirements-analysis:ui-less-mockups-as-output-contract(様式は既存兄弟ツールの既習様式に揃え新規発明しない)に従い、また team-practices.md の適用ポイントが引用する project.md Decided(既存 idiom 準拠)の趣旨に沿って、出力様式は既存の兄弟ツール(`amadeus-state.ts` の plain stdout / `{"error": "..."}`)に揃える。

## 出力契約(verdict 別、詳細化)

| verdict | 出力文言(例) | exit code |
|---|---|---|
| `claude-code` 検出(FR-2、env var) | `harness: claude-code (detected via CLAUDECODE env var)` | 0 |
| `codex`/`cursor`/`opencode`/`kiro` 検出(FR-3、dot-dir、補助シグナル) | `harness: codex (auxiliary signal via dot-dir probe, non-authoritative)` | 0 |
| 検出不能(`unknown`) | `harness: unknown (auto-detection unavailable)` | 0 |
| `manual` 上書き(FR-1 AC-1d) | `harness: manual (user-specified)` | 0 |
| 記録先ファイル不在等の異常 | `error: cannot write harness field to <path>: <reason>` | 1 |

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-07-24T12:30:55Z
- **Iteration:** 1
- **Scope decision:** none

検出フロー・出力契約・承認証跡・N/A判定は整合しているが、全5成果物の上流入力行のstories.md/team-practices.mdが本文で未参照の装飾トークンに該当するため差し戻す。

### Findings

- [Major] 全5成果物がstories.md/team-practices.mdを上流入力に列挙するが本文で未参照(装飾トークン、cid:body-derivation-before-header/artifact-upstream-inputs-header抵触)。少なくとも1箇所でteam-practices.mdの適用ポイントとstories.mdの利用シナリオ本文を実引用すること。
- [Minor] interaction-spec.mdがuser-flow.mdを詳細化した旨の明示引用がない。
- [参考/良い点] 検出フロー・出力契約・承認証跡・N/A判定は妥当。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-07-24T12:34:25Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1のMajor(stories.md/team-practices.mdの装飾トークン)は5成果物とも実引用に是正され上流成果物と整合。interaction-spec.mdのuser-flow.md明示引用も追加済み。軽微な引用精度Minorはブロックせずbuilder側で追加是正済み。

### Findings

- [解消確認] 全5成果物がstories.mdの利用シナリオ本文を実引用(stories.md:11と一致)。
- [解消確認] design-system-mapping.md/accessibility-checklist.md/interaction-spec.mdがteam-practices.mdの各節を正確に引用。
- [解消確認] interaction-spec.mdにuser-flow.md詳細化の明示引用を追加(iteration 1のMinor解消)。
- [Minor→builder是正済み] mockups.md/refined-mockups-questions.mdの「team-practices.md の Code Style」誤帰属を、team.md cid:ui-less-mockups-as-output-contract + project.md Decided の正しい出典へ是正した。
- [参考/良い点] 検出フロー・出力契約・N/A判定・承認証跡は妥当。
