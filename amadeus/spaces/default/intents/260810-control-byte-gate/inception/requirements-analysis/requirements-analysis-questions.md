# Requirements Analysis — 明確化質問

上流入力(consumes 全数): intent-statement.md(確定済み裁定 (a)〜(f) — 既決事項の再質問回避の根拠)、scope-document.md(要件・設計段への送付事項 — Q1/Q3 の争点定義元)、business-overview.md(grep 依存の検証規律という運用文脈 — Q1 full-tree 案の価値根拠)、architecture.md(source-only 境界 — untracked 面を走査対象外とする前提)、code-structure.md(tests/ 走査系ゲート群の配置 — Q3 fixture 自己衝突の構造的前提)

autonomy full 下のため、3問すべて `amadeus-bolt decide-question`(5段梯子)で裁定した(AUTO_DECIDED・reviewState: unreviewed)。既決事項(Issue 完了条件・クロスレビュー訂正 (a)〜(f))は再質問していない。

## Q1. 走査対象の最終確定(タイトル「tracked ソース」と宣言 5 dirs の齟齬解消 — reviewer-1 訂正提案 6)

- A. **full-tree**: `git ls-files` の全 tracked ファイルを走査し、正当バイナリは明示 path allowlist(現時点 `assets/AI-DLC-Workflows-2.0-Specification.pdf` 1件)で除外する — Issue タイトルへ**拡大**方向で整合。docs/・tests/ の個別判断を包摂し、RE 実測(全 16,124 files 中 NUL=PDF のみ)で偽陽性ゼロが成立済み。amadeus/ 配下の record 起草時混入(本 RE の Architect 実事例)も捕捉できる【推奨】
- B. issue-5dirs: Issue 宣言 5 dirs を維持(タイトル側を「手書き正本+tests/docs」へ改める)— 現状**維持**
- C. precedent-3dirs: 先例(core/harness/scripts)へ**縮小** — Issue 宣言と矛盾
- X. Other

[Answer]: A — AUTO_DECIDED(questionId: ra-q1-scan-scope、decider: agent-recommendation)

## Q2. 検出バイト集合

- A. **c0-full**: 0x00-0x08 / 0x0B / 0x0C / 0x0E-0x1F / 0x7F(= TAB 0x09・LF 0x0A・CR 0x0D を除く C0 制御バイト + DEL)— 表示層 canonical `CONTROL_CHARS`(amadeus-lib.ts:4298)の意味論と整合。RE Architect 実事例の混入4バイト(0x00/0x08/0x0B/0x1F)を全捕捉。コーパス実測で偽陽性ゼロ成立済み(reviewer-1: C0/DEL 保持=PDF のみ)【推奨】
- B. nul-only: 0x00 のみ — `isUtf8` と完全一致だが実事例4バイト中1バイトしか捕捉しない
- X. Other

[Answer]: A — AUTO_DECIDED(questionId: ra-q2-detection-set、decider: agent-recommendation)

## Q3. 落ちる実証の実現形(tests/ が走査対象に入ることとの自己衝突解消 — reviewer-2 設計段送付事項)

- A. **temp-commit**: 恒久の生バイト fixture をツリーに置かない。述語の unit テストは実行時生成(`Buffer.from([0x00])` — t427/t499/t225 の既習形)で行い、落ちる実証は一時注入→赤実測→復元→残渣ゼロ確認の不可分1セットで実施(注入面はゲートが実際に読む面を実測してから決定 — cid:code-generation:injection-surface-verify)【推奨】
- B. fixture-allowlist: 恒久 fixture をコミットし allowlist — sweep 偽陽性ゼロ契約と恒久矛盾
- X. Other

[Answer]: A — AUTO_DECIDED(questionId: ra-q3-falling-proof-form、decider: agent-recommendation)

## 裁定の記録

- 3問とも decide-question 梯子で確定(グラント intent-grant-a62c587cfa45e9316dc381840bdf7745、`list-auto-decisions` で後日レビュー可能)。
- Q1 の full-tree は Issue **宣言スコープ(5 dirs)からの拡大**だが、Issue **タイトル**(tracked ソース)およびクロスレビュー訂正提案 6 の「amadeus/ を含めるか」方向への一意整合であり、ユーザー起動指示(レビュー訂正を要件段一次入力とする)の範囲内。ゲート開示で明示する。
- ユーザー承認: 2026-08-10T08:32:03Z(autonomy full 起動指示の実 HUMAN_TURN、audit seq 19)
