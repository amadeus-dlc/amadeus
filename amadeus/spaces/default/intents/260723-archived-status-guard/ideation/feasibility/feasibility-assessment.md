# Feasibility Assessment — 260723-archived-status-guard

上流入力(consumes 全数): intent-statement(intent-capture 産)。competitive-analysis / market-trends / build-vs-buy は market-research SKIP のため設計上不在(N/A — 補完しない)。

測定 ref: engineer-1 worktree HEAD(2026-07-23T03:57Z 頃。以下の file:line はこの tree のコマンド出力からの転記)。

## Technical Viability — 判定: GO

1. **status 書込面は1点に収束**: `updateIntentStatus` の呼出元は `amadeus-state.ts:1904`(complete 遷移)の**1件のみ**(repo grep 全数)。enum 検証の導入点が単一 chokepoint で、既存経路の改修影響が最小
2. **ガード3経路の seam はすべて実在**: cursor 切替 = `amadeus-utility.ts` の intent verb(:3898 付近)/ `next` の intent 解決 = `activeIntent()`(orchestrate :526 コメントの解決連鎖)/ unpark = `amadeus-state.ts:757 handleUnpark` — いずれも archived 判定を前置できる関数境界を持つ
3. **移行対象の provenance は実在**: `260713-swarm-driver-migration/closure-note.md`(ユーザー裁定節あり)+ registry の `closed` 1件(分布実測: complete 65 / in-flight 3 / closed 1)— 移行は既存裁定の機械的執行
4. **archive/unarchive verb(E-ASGIC1 裁定 A)**: human-presence 検証は既存機構(assertHumanPresentForGateResolution 系・delegate provenance)の既習様式を再利用可能 — 新規発明不要
5. **落ちる実証**: archived intent への next 拒否は fixture record+cursor 設定で決定的に注入可能(既存 t248 系の統合テスト様式)

## Risk Analysis

- **中**: #1309 契約(e2 intent)との語彙同期 — enum 4値は E-ASGIC2 裁定で語彙契約として確定済みだが、e2 側の設計成果物が並行進化中。**実装前に e2 の status 語彙定義を参照して一致を機械確認する**(cross-unit-type-verbatim-check の intent 間版)を requirements の完成条件に含める
- **低**: 既存 `closed` 文字列を参照する他ツール・テストの残存 — repo grep で消費側棚卸しを requirements で固定(enum 化で `closed` は不正値になるため)
- **低**: cursor ファイルは gitignored per-user — ガードは cursor 書込時と読出時(next)の両側で必要(片側だけでは既存 stale cursor をすり抜ける — symmetric-pair)

## AWS / Platform Perspective(support: aws-platform)

リポジトリ内ファイル・CLI 設計のみでクラウド資源に不接触。N/A(根拠: project.md Deployment 節 — デプロイ基盤なし)。

## Compliance Perspective(support: compliance)

開発工程メタデータのみで規制対象データなし。監査面はむしろ改善(archive/unarchive の監査イベント新設 — E-ASGIC1 裁定)。
