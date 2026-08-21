# Services — 260821-fmc-retirement

上流入力: `requirements.md`(NFR-1 green-throughout、Constraints)、`components.md`。

## 本 intent におけるサービス面の適用範囲

削除 intent のためランタイムサービスの新設・変更はない。ここでは「配送・検証サービス」(削除を green のまま本線へ運ぶ機構)を設計対象とする。

## 配送サービス(Bolt 構成への入力)

- **単一 Bolt PR 志向**(scope Q3=A): 削除は相互依存が強く(テスト+コード+台帳+CI 配線の同時性)、分割すると中間状態の赤が構造的に生じる。**Bolt 1 = 退役全量**(walking-skeleton gate 付き — self-feature Mandated)を基本形とする
- 分割が必要になった場合の唯一の許容線: 「docs 部分除去」を後続 Bolt に切り出す(docs は t3028 整合を保てば独立 green 可能)。テスト/コード/CI/台帳の分割は不可
- multi-member bolt の per-unit PR 配送は禁止(cid:pr-convergence:c2-multi-member-single-pr-interim)— 本 intent は単一 unit 構成とし該当しない

## 検証サービス(既存 CI の利用 — 新設なし)

| 検証面 | 実行点 | 根拠 |
|---|---|---|
| typecheck / lint / targeted テスト | ローカル(push 前の即時検査) | push-first 規律 |
| フルスイート・coverage 両ゲート・隔離2回再現性・source-only・グラフ不変量・plugin-conformance-e2e・t3028 | リモート CI(正本) | remote-first |
| FR-CI-1 の集約整合(「赤が止めるか」) | ci-success の needs から FMC 除去後、他 required の赤で queue が止まることは既存 Ruleset が保証 — 除去 diff で needs リスト整合を実読 | NFR-4 |
| 受け入れ grep 述語(FR-DEL-1) | マージ後 origin/main 断面 + 対照リテラル(`pr-convergence` 非ゼロ) | P2 / zsh 配列規律 |

## Issue クローズサービス(FR-ISS-1、着地後)

対象棚卸しは delivery 後に `gh issue list --search`(キー: formal-model-check / tla / TLC / model-map)で実測し、#3246 を含む全数へ理由コメント(「FMC 退役 — intent 260821-fmc-retirement、再設計時に再起票」)付きクローズ。mirror Issue #3392 は engine の completion boundary が所有(手動クローズしない)。
