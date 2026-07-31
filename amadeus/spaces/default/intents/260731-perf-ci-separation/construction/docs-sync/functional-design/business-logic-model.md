# Business Logic Model — U4 docs-sync

上流入力(consumes 全数): unit-of-work.md(U4 定義)、unit-of-work-story-map.md(ジャーニー1「CI 構成の理解」)、requirements.md(FR-6/NFR-1 非退行層)、components.md(C-7 棚卸し表)、component-methods.md(C-7 dual-key)、services.md(記述すべき最終形の実行面表)

測定 ref = observed `da51af375`。

## ロジック0: 位置づけ

unit-of-work.md U4 の定義(最終形の CI 構成を文書化、依存 = U3)を実現する。記述内容の正本は services.md の実行面表(blocking = smoke+unit+integration の ci.yml / 非 blocking = perf.yml の daily)であり、unit-of-work-story-map.md ジャーニー1「CI 構成の理解」体験を提供する。

## ロジック1: 更新対象の確定

components.md C-7 棚卸し表(✅ 10ファイル)を初期集合とし、Bolt 冒頭で component-methods.md C-7 の dual-key(フラグ名系 + 展開後リテラル系)grep を再実行して鮮度を確認(陳腐化検査 — U1〜U3 の着地で対象が増えている可能性)。差分があれば棚卸し表を更新してから着手。

## ロジック2: 更新内容

- tier 一覧に perf を追加(docs/reference/09-testing 系が主)— `--ci` = smoke+unit+integration(不変)、`--perf` 新設、`--all` に perf 包含
- perf.yml の存在・トリガー(daily cron + dispatch)・非 blocking 契約・60日 suspend 注記(requirements.md R-3)
- distribution-benchmark の所在変更(ci.yml → perf.yml)
- en/ja 対訳ペアは同一 PR 内で同期(BR-U4-2)

## ロジック3: NFR-1 非退行層の実測記録

requirements.md NFR-1(ii) の非退行 bound(移設後 `tests` job wall-clock ≤ 移設前対照断面)を、U1〜U3 着地後の main run 実測で確定し、本 Unit の成果物(PR 本文または record)に測定 ref 付きで記録する。上回った場合は NFR-1 不合格として原因帰属してから完了。

## 検証計画

- 対訳同期・参照整合(リンク切れ 0)
- 件数語の隣接列挙原則(cid:functional-design:c3-adjacent-enum-numerals)
- TDD 適用外分類(文書のみ)— ただし docs を読む guard 類(doc-count 系)が対象 docs に存在しないか grep 確認(ci-paths-ignore-doc-guard-blindspot)

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-31T11:06:55Z
- **Iteration:** 1
- **Scope decision:** none

consumes 接地・FR-6/NFR-1・ガード盲点対応は健全。独立再 grep で README.ja.md(3 hit)が C-7 由来の台帳と BR-U4-2 の対訳4組カウントから漏れており、実装すると en/ja drift を出荷する完全性欠陥のため NOT-READY。

### Findings

- [Major] domain-entities.md:11: 更新対象台帳に README.ja.md が欠落(dual-key grep 3 hit の実測)
- [Major] business-rules.md BR-U4-2: 対訳ペア数 4組 → 正しくは 5組(README en/ja を含む)

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-31T11:08:50Z
- **Iteration:** 2
- **Scope decision:** none

it.1 の2指摘は閉包(README.ja.md 台帳・5組・repo 全域再 grep で他漏れなし・hit 数逐語一致)。残余1件のみ: business-logic-model.md:13 の「✅ 9ファイル」が 10 へ未伝播(機械検証可能な件数クラス)。

### Findings

- [Minor] business-logic-model.md:13: 初期集合の件数表記 9ファイル → 10ファイル(是正の同一 Unit 内伝播漏れ)
