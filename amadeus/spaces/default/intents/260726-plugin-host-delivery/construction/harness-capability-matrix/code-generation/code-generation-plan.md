# Code Generation Plan — U1 harness-capability-matrix(Bolt 1)

> 上流入力(consumes 全数): functional-design/domain-entities、functional-design/business-logic-model、functional-design/business-rules、application-design/decisions(ADR-4/ADR-5)、application-design/components(C9)、application-design/component-methods(C1/C3/C4)、application-design/services、units-generation/unit-of-work-story-map、requirements(FR-1)、nfr-design/performance-design、nfr-design/security-design、nfr-design/scalability-design、nfr-design/reliability-design
> 本 Unit はコード非搬送(record 文書 PR)。プローブ = 一次資料の read-only 実測。判定 = business-logic-model.md の決定的判定ロジック。
> 検証契約(nfr-design): 各セルの trace は reliability-design「参照 ID 規約」の `P-<harness>-<面>` 形式 probe-id(42 個 distinct)、count 照合は scalability-design「列の固定列挙」の 7×6=42。ProbeRecord のフィールド様式は security-design「ProbeRecord 様式」の fail-closed 決定に従い、performance-design のとおり時間フィールドは設けない。

## 測定 ref

- HEAD SHA（git rev-parse HEAD 実測）: `7833768fb6bca7de750d39bb800dccc0e0cc46d0`
- すべての file:line 引用は本 SHA の作業ツリー実測に紐づく（measurement-ref-in-artifacts）。

## 面 × 情報源 × 手順（実施順）

6 面（domain-entities.md の HarnessCapabilityRow の 6 コンテンツ列）を 7 ハーネス全数に適用する。単一面の実測で「可」を確約しない（seam-feasibility-multi-facet / BR-U1-4）。

| # | 面 | 情報源（この順で直読） | 手順 | measured / deferred の分岐 |
|---|---|---|---|---|
| P1 | distribution（配布形式＋クラス割当） | (1) `packages/framework/harness/<name>/manifest.ts`（harnessDir）(2) `scripts/plugin-projection.ts`（PACKAGE_HARNESSES / SELF_INSTALL_HARNESSES）(3) `packages/framework/harness/projections.ts`（selfRoot）(4) `dist/<harness>/`, `dist/plugins/` の実在 (5) feasibility-assessment.md（上流 Plugin Mechanism doc） | 各ハーネスの配布ディレクトリと self-install 有無を実測。ホスト native 導入 UI/コマンド（Claude marketplace 等）はローカル実行不能面を `⚠ deferred` | native 導入 UI の実測不能面 → deferred。フック機構実測可 → folder-drop-auto へ機械割当 |
| P2 | trust（信頼境界・承認） | `<name>/emit.ts`（codex trust-hash / cursor・opencode permission）, `claude/settings.json.example`, ADR-4「trust grant は engine 側で同一」 | ホスト側 trust 機構と Amadeus trust grant の重ね方を実測引用 | ホスト trust 機構は実ファイル引用で measured。Amadeus grant は既存 engine 契約（measured） |
| P3 | composeTrigger（イベント語彙＋起動保証） | `<name>/emit.ts` HOOK_WIRING / `<name>/hooks/` アダプタ / `kiro*/agents/*.json` / `kiro-ide/hooks/*.kiro.hook` / `opencode/plugin/*.ts` | 「機構の存在」と「イベント語彙」を分離実測（BR-U1-4）。書き手の起動条件（どのイベントで発火するか）まで確認（seam-writer-mode-precondition） | ホスト event 名がファイル実測できれば measured。session-start 相当が未配線の面は deferred（opencode）|
| P4 | rootResolution（project/plugin/harness root） | `core/tools/amadeus-lib.ts:297`（resolveProjectDirFromHook）, `<name>/hooks/*lib.ts`, `opencode/lib/amadeus-opencode-vocab.ts`, `claude/manifest.ts:25-38` | 各面の root 解決の env/ladder を file:line で実測 | 全面ソース実測可 → measured |
| P5 | userOps（compose/doctor/drop の手動床） | component-methods.md C1 verb 表 | 全ハーネスで手動床 1 コマンド（`compose`）が成立することを C1 契約へ写像 | C1 は engine 中立で全ハーネス共通 → measured |
| P6 | degradeContract（非対応時の明示 degrade） | business-logic-model.md 判定ロジック, unit-of-work-story-map ジャーニー 1/2, component-methods.md doctor verb | 非対応・deferred 面ごとに「手動床 1 コマンド＋doctor 表示」を明文化（silent skip 禁止 — BR-U1-3） | 契約文の起草（measured 面と deferred 面の両方に付す） |

## クラス割当ロジック（決定的 — business-logic-model.md:16-19）

1. `native-manifest`: ホスト標準プラグイン導入 UI/コマンドが実在（実測）かつ install 後配置が compose 入口から到達可能
2. `folder-drop-auto`: 標準機構なし・セッションライフサイクルフックから bun スクリプト起動が実測可能
3. `manual-only`: 上記いずれも実測不能 → 手動 1 コマンド（C1 compose）のみ契約
- 判定不能は manual-only へ fail-closed（BR-U1-6）。希望的割当（存在しない機構の仮定）は FR-1 不合格。

## ライブプローブ方針

本セッションにはホスト CLI（claude-code / codex / cursor / kimi / kiro / opencode の各バイナリ）が導入されておらず、mutation を伴わない read-only のリポジトリ実測のみ実施可能。ホスト native 導入機構（Claude marketplace の `/plugin` UI 等）はローカル起動不能のため `⚠ deferred(実装時実測)` とし、確定条件を 1 行で付す（BR-U1-2）。ライブ起動が可能になった場合の前処理等価（probe-preprocessing-parity / BR-U1-5）の要件は ProbeRecord に確定条件として記録する。

## 出力

`harness-capability-matrix.md`（本体: マトリクス＋クラス割当＋degrade 契約＋ProbeRecord＋Bolt3/6 機械可読列挙＋測定 ref）と `code-summary.md`（実施要約）。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-26T17:45:56Z
- **Iteration:** 1
- **Scope decision:** none

全数性・引用照合・fail-closed 割当・YAML 列挙は妥当。Major 1: ProbeRecord の per-cell trace(P-<harness>-<面> × 42)という nfr-design の検証契約を無申告で 6 ID へ縮退。Minor 1: nfr-design 4 点のヘッダ未記載(縮退の根本原因)。

### Findings

- [Major] probe-id が列共有 6 個 — nfr-design の 42 セル distinct trace 契約の無申告縮退
- [Minor] nfr-design 成果物のヘッダ未記載

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-26T17:51:30Z
- **Iteration:** 2
- **Scope decision:** none

probe-id 42 セル distinct(機械 count 42・索引表 1:1・旧タグ残存 0)、nfr-design 4 点のヘッダ宣言+実参照を確認。iteration 1 の Major/Minor は閉包。

### Findings

- None
