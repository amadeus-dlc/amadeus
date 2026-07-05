# Functional Design 質問 — unit: parallel-policy-docs

Construction では質問は例外扱いのため、配置の確定 2 点だけを扱う。
回答方式: Maintainer の包括委任に基づく自己回答（根拠付き）。

---

## Q1. R001/R006 の記載先の節

- A. team.md の並行運用ポリシーに新節「worktree の階層と Bolt 実行契約」を追加し、R001（関係の明文化）と R006（イベント契約と gate evidence、意図的差分）をまとめて置く（推奨）
- B. Git Branching Policy 側に置く
- X. Other

[Answer]: A（自己回答。根拠: 並行運用ポリシーは「複数 worktree にまたがる並行の判断」を責務として明記しており、worktree の階層はその中核。Git Branching Policy は単一 branch の lifecycle が責務で不適合）

---

## Q2. R004 の実例追記の形式

- A. 既存の根拠表（判断基準 / 実例 / 参照の 3 列）へ行追加し、必要な判断基準（worktree 占有の通知・引き渡し、意味的接触の申し送り、指示系統の委任）は本文の該当節へ最小限で追記する（推奨）
- B. 根拠表への行追加のみ
- X. Other

[Answer]: A（自己回答。根拠: 並行運用ポリシーの原則「新しい実例が観察された場合は実例の根拠付きで判断基準を更新する」に従う。表だけ足すと判断基準本文との対応が切れる）

---

## Q3. `memory/phases/construction.md` が実在しない事実への対応（reviewer 指摘）

`aidlc/spaces/default/memory/phases/` は現行 workspace に存在せず（git 全履歴にもなし）、`.agents/rules/amadeus.md` の @-import は空読みになっている。engine の seed 機構（memory-seed/phases/*）は default tree 全体が不在の場合しか発火しない。

- A. `phases/construction.md` を新規作成する。構造は seed テンプレート（`.agents/amadeus/tools/data/memory-seed/phases/construction.md`: タイトル＋適用宣言＋H2 見出し群）を踏襲し、既存 seed 見出し（Code Completeness 等）をそのまま含めた上で、workflow 運用の新見出し「## Bolt 運用」を追加して R002/R003 の内容を置く（推奨）
- B. team.md 側の新設節へ寄せる（phase memory は作らない）
- X. Other

[Answer]: A（自己回答。根拠: phase memory は Construction stage の rules_in_context として engine が自動ロードする配送先であり、切り直し手順を Construction 実行中の conductor に届ける正しい経路。seed 構造の踏襲により将来 seed が発火した場合や learnings §13 の書き込み先とも整合する。sibling（ideation.md 等）の作成は本 Intent の対象外。新見出し「Bolt 運用」の追加理由は diary に記録する）
