# フェーズ境界検証 — Inception → Construction

Intent: `260810-plugin-harness-dir-token` / Scope: `self-fix` / Depth: Minimal
実施日: 2026-08-10 / 観測 ref: `df1c874cfb397fafe877a72f00a82664a59689ae`
方法論: `.claude/knowledge/amadeus-shared/verification.md`

## スコープ由来の適用範囲

`self-fix` は 32 ステージ中 7 ステージのみを EXECUTE する。Inception フェーズで実行されたのは
`reverse-engineering`（2.1）と `requirements-analysis`（2.3）の 2 件で、
`user-stories`（2.4）・`application-design`（2.6）・`units-generation`（2.7）・`delivery-planning`（2.8）は
**スコープ設計により SKIP**（欠落ではない）。

したがって標準の「Requirements → Stories → Architecture」連鎖は本 intent には存在せず、
検証対象の連鎖は **Issue → 実測所見 → Requirement → 受け入れ条件** となる。
次ステージは `code-generation`（3.5）であり、要件は設計文書を経由せず直接実装へ渡る。

## 追跡性マトリクス

| 上流 | 中間（実測所見） | Requirement | 受け入れ条件の判定可能性 |
|---|---|---|---|
| Issue #2790 患部 | 患部行 verbatim（PROVEN） | FR-1 | 文字列述語 2 件 — 判定可 |
| クロスレビュー U-1 | N-3 self-install が経路B（PROVEN） | FR-2 | (i)(ii)(iii) × 5 面 — 判定可 |
| クロスレビュー U-1 | `collectPluginSources:821-838`（PROVEN） | FR-3 | (i)(ii)(iii) — 判定可 |
| N-1 transform 未発火 | 8 面 byte-identical（PROVEN） | FR-4 | (i)(ii)(iii) × 8 面 — 判定可 |
| reviewer-1 の両面実証要求 | — | FR-5 | 修正前赤・修正後緑 — 判定可 |
| reviewer-2 の N-6 | 偽陽性 0 件（PROVEN） | FR-6 | 患部復元で赤 — 判定可 |
| N-5 述語の網羅不足 | 3/7 harnessDir のみ（PROVEN） | FR-7 | 4 個の陽性判定 — 判定可 |
| t146 第 2 テストの前提 | core 前提（PROVEN） | FR-8 | 下限テスト緑 — 判定可 |
| reviewer-2 の隣接所見 | 11 行の内訳（PROVEN）／解決不能は DEDUCED | FR-9 | Issue 起票と相互リンク — 判定可 |

**孤児（上流を持たない要件）**: 0 件。FR-1〜FR-9 のすべてが Issue #2790 本文、
クロスレビュー 2 名の指摘、または RE ステージの実測所見に紐づく。

**欠落（要件へ落ちなかった上流）**: 3 件。いずれも「スコープ外」節で明示的に除外済み。

- 兄弟 11 行の**修正**（FR-9 で Issue 起票のみに縮退 — Q2-C の人間裁定）
- N-2（`dist/<harness>/<harnessDir>/plugins/` 不在と header コメントの齟齬）
- `boundary-guard.ts` の `SCAN_ROOTS` 欠落 4 面

黙って落としたものはない。

## 整合性チェック

- **人間裁定との整合**: Q1-A / Q2-C / Q3-A / Q4-A の 4 件が FR-3 / FR-9 / FR-6+FR-7 / FR-5 に写像。
  iteration 1 で FR-3 が Q1-A に反して compose 側を実装者裁量として残していたが、
  レビュアー BLOCKER により是正済み（Review — Iteration 2 に記録）
- **成果物内の自己矛盾**: iteration 1 で FR-4 の受け入れが claude 面で判定不能だった点を是正済み
- **PROVEN / DEDUCED / UNMEASURED の分離**: 保持。DEDUCED は兄弟 11 行の解決不能性 1 件のみで、
  FR-9 が実測を Issue 側へ送る形で格上げを回避している
- **深度契約**: FR 9 件（Minimal の 5-10 帯）、1,340 B/FR（上限 1,800 B/FR）

## 上流成果物のカバレッジ

`requirements-analysis` の `consumes` のうち存在するもの（`business-overview` / `architecture` /
`code-structure`）はすべて requirements.md の「上流成果物の参照」節で参照済み。
`intent-statement` / `scope-document` / `team-practices` はスコープ SKIP による設計どおりの不在で、
その旨を成果物内に明記済み。

## レビュー状態

- `reverse-engineering` — 承認済み（reviewer 宣言なし。§13 は全件スキップ）
- `requirements-analysis` — reviewer `amadeus-product-lead-agent` が iteration 2 で `READY`。
  BLOCKER 0 件。FOLLOW-UP 2 件は成果物末尾の Review ブロックに記録済み

## 判定

**PASS** — 孤児 0 件、黙示の欠落 0 件、判定不能な受け入れ条件 0 件。Construction フェーズへ進行可能。

## 人間承認

- [ ] 上記のフェーズ境界検証を確認した
