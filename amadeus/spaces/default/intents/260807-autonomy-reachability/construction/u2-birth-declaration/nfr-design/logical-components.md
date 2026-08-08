# Logical Components — u2-birth-declaration

上流入力(consumes 全数): business-logic-model.md(フロー)。nfr-requirements 系5成果物は SKIP により未生成(設計どおりの不在)。

## 論理構成(層別保証)

| 論理コンポーネント | 実体 | 保証機構 |
|---|---|---|
| Launch Judgment | C13 judgment(拡張 — 純関数) | H0a/H0b 分岐の unit テスト(t450-apply 改訂) |
| Birth Carrier | birth print directive の emit 点(7b/9a/4a) | emit 点でのみ carry 確定 — ask 経路 loud 拒否の integration テスト |
| Birth Applier | intent-birth の `--autonomy` 分岐 | semi/none = canonical 適用委譲、full = 儀式印字停止 — CLI integration テスト |
| E2E Fixation | 1コマンド→directive 搬送の e2e | integration(実 FS)— FR-1d の固定点 |

## テスト層配置

- judgment 純関数は unit 層(t450-apply 系)
- CLI 分岐・e2e は integration 層(t450-branch 系+新規 e2e — fs-tests-integration-first)
- push 前 lcov で配線行 DA 確認(lcov-wiring-line-checklist)。t450×2 改訂の対角実測(c6-260803-state-integrity)は builder の code-summary 記録+reviewer 検証
