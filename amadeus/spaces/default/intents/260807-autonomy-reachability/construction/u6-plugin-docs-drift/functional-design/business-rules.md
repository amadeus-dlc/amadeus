# Business Rules — u6-plugin-docs-drift

上流入力(consumes 全数): requirements.md(FR-6a 受け入れ基準)、components.md(C6 境界)、component-methods.md(コード変更なしの確認)、unit-of-work.md(境界 = 2ファイルのみ)、unit-of-work-story-map.md(物語の保証条件)、services.md(サービス面変更なし)。

## 規則

- **BR-U6-1(文言の grep 閉包)**: 是正後、両ファイルから `never runs it automatically` の grep が 0 件(FR-6a 受け入れ基準)
- **BR-U6-2(3分岐の明記)**: 代替文言は none / semi / full の3分岐を明記し、semi/full の無人起動可能性と根拠(`amadeus-advisory-choice.ts` の question ルーティング)を示す。`scopes: []` の stock 非所属記述は変更しない
- **BR-U6-3(挙動不変)**: 変更は文書2ファイルのみ。plugin compose・graph compile・テストの挙動に影響しないこと(全検証コマンド green 維持)を確認してから完了
- **BR-U6-4(対称面の同時是正)**: 同一文言を持つ2ファイルを同一変更で是正(片側是正は同根残存 — same-root-inventory)

## 受け入れ基準への写像

| BR | FR | 検証形 |
|---|---|---|
| BR-U6-1 | FR-6a(grep 0 件) | 文言 grep(是正前 2 件 → 是正後 0 件の対照) |
| BR-U6-2 | FR-6a(3分岐明記) | 文言 grep(none/semi/full の各語の実在) |
| BR-U6-3 | NFR-5 | 全検証コマンド再実行 green |

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-07T15:30:47Z
- **Iteration:** 1
- **Scope decision:** none

逐語引用・3分岐モデル・両側 grep 検証・スコープ限定・FR-6b 遵守をすべて確認。NIT 1(写像表に BR-U6-4 不記載)

### Findings

- NIT | business-rules.md:14-18 — 写像表に BR-U6-4(対称面同時是正)が不記載 — 本文規定済みで実害なし
