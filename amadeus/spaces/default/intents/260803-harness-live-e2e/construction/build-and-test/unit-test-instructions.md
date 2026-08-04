# Unit Test Instructions

## 上流成果物と対象

各 `code-generation-plan.md` / `code-summary.md` が定義するpolicy、registry、journey assertion、ledger、matrix、adversarial oracleを検証する。Comprehensive戦略として、正常系だけでなくstrict opt-in、GHA hard deny、closed taxonomy、bounded evidence、cleanup barrier、at-most-once ledgerを対象にする。

## 実行方法

```bash
bun test \
  tests/unit/t-codex-exec-live-gate.test.ts \
  tests/unit/t-claude-print-live-gate.test.ts \
  tests/unit/t-claude-sdk-live-gate.test.ts \
  tests/unit/t-claude-tui-live-gate.test.ts \
  tests/unit/t-live-e2e-kernel.test.ts \
  tests/unit/t-live-e2e-hardening-kit.test.ts
```

## 合格基準

- failure 0件
- GHA deny時のprobe/scratch/process/ledger呼出し0回
- exact string `1` 以外のopt-in拒否
- cleanup barrier失敗時は `cleanup-barrier-failed`、C8 append 0回
- baseline greenとstable mutant redの双方を確認
- raw credential、source path、prompt、全文outputをdurable evidenceへ残さない

## Test Data

固定canary、seed付きproperty corpus、fake adapter/worker/tmuxを使用する。実credential、network、provider課金はunit testへ持ち込まない。
