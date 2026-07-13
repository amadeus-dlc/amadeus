# Bolt Plan — metrics-observation

> scope=feature のため walking-skeleton 既定(org.md)を適用: Bolt 1 は小さな end-to-end スライスとして単独・ゲート付き実行し、承認後に残り Bolt へ。code-generation の skeleton stance は scope-dependent(engine 既定で feature=on)。

## Bolt 1(walking skeleton・単独ゲート): snapshot-skeleton

- 内容: U1(tests-totals.json seam)+U2 の最小スライス — スキーマ組み立て+temp→rename writer+**dist_size collector 1本**(依存ゼロで最単純)+CLI verbs(--write/--check/usage)。手動 `--write` で metrics/*.json が生成される E2E が成立。
- ゲート根拠: 新規の観測系統(metrics/ 配下への書き込み面)の初導入 — スキーマ・アトミック性・verdict 契約という以後の全 Bolt の土台をここで人間確認。
- 完了条件: FR-2/FR-4/FR-5 の骨格 AC が dist_size 1本で green(注入テスト含む)。

## Bolt 2: collectors-complete

- 内容: 残り5 collector(ccn/coverage/loc/tests/test_pyramid)+FR-4 注入テストの全数化+FR-5 疎結合テスト。
- 依存: Bolt 1 の配列駆動インターフェースに追加するのみ(D4)。

## Bolt 3: ci-wiring(U3)

- 内容: ci.yml へ metrics-snapshot job(needs: coverage、main push 限定、job 単位 write)。ループ非誘発の文書化+実証。
- 依存: Bolt 2(coverage/tests collector が CI 成果物を消費するため全 collector 完成後)。

## 実行順とゲート

Bolt 1(単独・ゲート)→ ラダープロンプト(org.md: 自律 or 全ゲート)→ Bolt 2 → Bolt 3(直列 — 2/3 は同一ファイル非交差だが機能依存で直列)。
