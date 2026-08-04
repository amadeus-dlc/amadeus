# Build and Test Summary — Intent autonomy

## 対象と戦略

U1〜U5の各`code-generation-plan.md`と`code-summary.md`、およびNFR設計を対象に、Comprehensive strategyでbuild、unit、integration、E2E、性能境界、security boundary、distribution parityを検証した。rebase後の最新`origin/main`を基準に全検査を再実行している。

## 検証インベントリ

| 種別 | 対象 | 判定 |
| --- | --- | --- |
| Build | build、lint、typecheck、coverage registry、source-only / distribution / promotion drift、diff check | PASS |
| 全回帰 | smoke、unit、integration、E2E、performance | 808 files、0 fail、10,806 assertions |
| Production path | mode選択、Intent grant、質問裁定、quality repair、replan、park、Core終端 | 6 pass、0 fail |
| Performance | bounded state、partition-local replay、上限付きrepair / replan | PASS（構造オラクル） |
| Security | real-human provenance、fail-closed authorization、redaction、tamper resistance | PASS |
| 5 harness projection | Claude Code、Codex、Cursor、OpenCode、Kimi Code | PASS |
| Formal Model Check | 仕様上の反例探索 | NOT_DETECTED（run ID `1fca666e-26b8-49f8-a43f-783972b6b650`） |
| Opt-in live | 実credentialによるnative harness実行 | 1明示的SKIP（Core非blocker） |

## Readiness

以前のNOT READY要因だったproduction wiring、mode契約、Core終端とlive receiptの結合、full modeの実経路は解消した。`full`は品質が健全なときIntent終端まで進み、NOT READYはbounded repairで手当し、非生産的ループだけをgrant保持のままparkする。`semi`と`none`も同じUnit DAG schedulingを維持する。

成果物はbuild-ready、test-ready、feature-ready、Intent-terminal-readyである。Operation phaseはscope上SKIPであり、deployment-readyを本stageの完了条件にはしない。

## 制約と外部検証残

- AWS / harness credentialがないためopt-in live smokeは実行していない。SKIPは明示し、PASSとは扱わない。
- PR作成・review・mergeはAI-DLC v2 Coreの外側であり、本判定へ含めない。
- Issue #1241、外部supervisor、常駐serviceは本Intentの対象外である。
- `package.ts --check`はrebase先で廃止済みのため、正規の`source-only:check` / `distribution:check`を使用した。

## 総合判定

主要受入条件と回帰検査がすべて成功し、外部live検証残はCore完了から疎結合である。Build and Testは**READY**である。
