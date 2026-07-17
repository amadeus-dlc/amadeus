# Quality Gates — Issue #1048(既存正本の文書化)

上流入力(consumes 全数): `../installer-enum-extension/code-generation/code-summary.md`、`../build-and-test/build-and-test-summary.md`、`../build-and-test/build-test-results.md`。

## ブロッキングゲート(PR マージ前提 — すべて既存)

1. typecheck / lint exit 0
2. dist:check / promote:self:check exit 0(8ミラー同期 — Bolt 1 の C6 変更を機械検証)
3. テストスイート 0 fail(契約テスト6値・fixture 完走・t230 を自動包含)
4. patch gate: 新規行の in-process 被覆(Bolt 1 実測 9/9 uncovered 0)+relative gate(-0.02pp)

## 非ブロッキング(loud-fail)

Snapshot 系 job は PR blocking 集約外・main 上の失敗は赤可視化(ci-pipeline:c3)— 本 intent での変更なし。

## 新設ゲート

なし — 落ちる実証の対象となる新設検証も存在しない(FR-2 の落ちる実証は既存契約テストの拡張面で実施済み — build-test-results.md)。
