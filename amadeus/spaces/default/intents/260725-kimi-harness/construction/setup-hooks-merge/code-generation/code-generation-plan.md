上流入力(consumes 全数): unit-of-work, requirements

# Code Generation Plan — setup-hooks-merge(Bolt 3)

unit-of-work.md の U3 と requirements.md の FR-3/FR-7c、および本 unit の FD/NFR 成果物(business-logic-model.md §マージフロー・§planMerge、business-rules.md BR-1〜BR-7、domain-entities.md §ManagedBlock・§MergePlan、nfr-design の reliability/security 設計)に基づく。story 相当は FR-3/FR-7c。

**Bolt 2 の実機発見(必須考慮)**: kimi CLI 0.28.1 は config.toml を再シリアライズし、コメントを落とす(code-summary — kimi-hook-adapter)。managed block のマーカーコメントは CLI が config を書き換えると消えうる。設計対応: (a) 識別はマーカーコメントだけに依存せずブロック内容(既知の `[[hooks]]` 群)でも検出できる二重識別、(b) マージ時にマーカーが消えていても正しく replace できる、(c) doctor(B4)がマーカー欠落を検出できる、ことを設計に織り込む。

- [x] **Step 1: domain/kimi-hooks.ts 実装**(FR-3a)
  - `renderManagedBlock`・`planMerge`(add/replace/noop/重複検出 loud fail/TOML 不正 loud fail)・`applyMerge`・`removeManagedBlock`。ブロック外はバイト保持。TOML 検証は `Bun.TOML.parse` を検証専用で使用(新規依存なし)
  - 識別はマーカー行 + 内容ベースの二重方式(Bolt 2 発見への対応)。マーカー欠落時は内容で managed block を検出して replace できる
- [x] **Step 2: modules/kimi-hooks.ts 実装**(FR-3b)
  - 既存の plan report への差分表示・wizard confirm 連携・拒否時は変更なし + 手動手順。バックアップ作成(`config.toml.amadeus-backup-<ISO>`)→ 既存 apply-write port で atomic 書込み。除去導線
  - KimiHome 解決(`$KIMI_CODE_HOME` ?? `~/.kimi-code`)を1箇所に集約
- [x] **Step 3: 単体テスト**(FR-7c・Standard 戦略)
  - 6ケース: add(空/既存14件相当で既存保持)・noop・replace・重複検出 loud fail・TOML 不正 loud fail・atomic・除去(マーカー内のみ)。CLI の再シリアライズを模したケース(マーカー欠落の config に対する replace)を追加
- [x] **Step 4: 検証**
  - `bun run typecheck`・`bun run lint`・関連テスト・`bun run dist:check`(setup の変更が dist に影響しないこと)

## トレーサビリティ

- FR-3a → Step 1 / FR-3b → Step 2 / FR-3c → Step 1-2(atomic・バックアップ・loud fail) / FR-3d → Step 2(非対話は既存規則) / FR-7c → Step 3 / DoD → Step 4

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-26T04:35:25Z
- **Iteration:** 1
- **Scope decision:** none

plan は U2 発見を全 step に織り込み U3 を完全にカバー。二重識別設計は偽陽性なく Bolt 2 発見に正答。逸脱7件は全て正当で正しくスコープ化。検出3件は記録衛生の minor で同一 iteration で修正済み。

### Findings

- (minor / plan) チェックボックス未マーク → 修正済み(conductor が4件を [x] に更新)
- (minor / FD BR-2) マーカー基準の旧記述 → 修正済み(二重識別へ現行化)
- (minor / FD 除去フロー・§関係) removeManagedBlock の旧シグネチャ → 修正済み((configText, block) に現行化)
