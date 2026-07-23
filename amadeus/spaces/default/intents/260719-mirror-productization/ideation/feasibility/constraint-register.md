# Constraint Register — mirror-productization

> 上流入力(consumes 全数): intent-statement.md

## 技術制約(C)

| ID | 制約 | 出典 |
|---|---|---|
| C-01 | gh は optional runtime 依存 — 不在・未認証は loud エラー(exit 1)で当該機能のみ不可、workflow は止めない。トークンを持たず gh keyring へ委譲 | G-1(ノルム改定を伴う) |
| C-02 | 正本は packages/framework/core/tools/、scripts/ 版は同一変更で廃止(二重実装 Forbidden) | G-2 |
| C-03 | 配布3面(core/dist/self-install)は dist:check / promote:self:check で機械同期 — 手編集禁止(既存 Forbidden) | project.md 既決 |
| C-04 | engine 変更は既存 directive 語彙(ask/print)の範囲 — 新 kind を作らない | G-4 |
| C-05 | auto 実行は sync のみ。create/close は auto 設定下でも ask 必須。close は close-after-landing 検証維持 | G-7 |
| C-06 | 3層 config は Global(amadeus/ 直下 git 共有)→Space→Intent の下位優先。マシンローカル層は作らない。初キーは auto-mirror のみ(既存設定の移行禁止) | G-5b/G-6 |
| C-07 | sync は record→Issue の一方向(Issue 側編集は正本に影響しない)— 現行 mirror.ts の契約維持(mirror.ts:4-7 verbatim「sync is strictly record -> issue (one-way)」) | intent-first-mirror-issue ノルム |
| C-08 | next 出力を消費する既存テスト・ツールへの影響は repo grep で棚卸ししてから変更(stderr-addition-consumer-grep / stdout-directive-stderr-advisory) | team/project.md 既決 |

## プロセス制約(P)

| ID | 制約 | 出典 |
|---|---|---|
| P-01 | ノルム改定(gh optional)は norm PR(独立レビュー+ユーザー承認マージ)経由 | norm-changes-via-pr |
| P-02 | 本 intent はユーザー直接対話方式(質問は user へ、選挙は上書き) | user decision 2026-07-19 |

## 未決(U — 委任先確定済み)

| ID | 未決 | 委任先 |
|---|---|---|
| U-01 | intent/Bolt 分割(ツール+SKILL の軽面と engine+config の重面) | scope-definition |
| U-02 | mirror verb の実行主体制約の有無 | design |
| U-03 | 設定ファイル形式(yml/json/md)と SKILL の6ハーネス生成様式 | design |
| U-04 | phase 境界 ask の発火粒度(全 phase 境界か、特定境界のみか)+ミラー未作成 intent での create 選択肢の出し方 | requirements |

## 改定履歴(申告)

- 2026-07-23T01:13:55Z — P-02 改定(ユーザー裁定、leader 経由 agmsg 2026-07-23T01:13:32Z): 本 intent の**継続分(inception 以降)に限り**質問の裁定方式を「ユーザー直接対話」から「選挙」へ変更(可否同数のみユーザーエスカレーション)。改定自体がユーザー裁定であり P-02 との矛盾はない(cid:approval-lineage-citation の追加裁定として requirements 冒頭系譜にも反映)。ideation 当時の P-02 記録は履歴として不変。
