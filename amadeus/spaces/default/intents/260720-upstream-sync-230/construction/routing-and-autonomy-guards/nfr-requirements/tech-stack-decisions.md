# Tech Stack Decisions — routing-and-autonomy-guards

> 根拠: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。既存workflow runtime choke pointの是正であり、新技術を導入しない。

## 採用する既存stack

| Concern | Decision | Rationale |
|---|---|---|
| Runtime | Bun 1.3.13 | CLI、hooks、tests、packagingの既存runtimeを維持する。 |
| Language | TypeScript ESM | pure discriminated resultと薄いadapterを既存codebaseへ実装できる。 |
| Time/FS seam | 注入可能な`nowMs`、stat、unlink | wall clock/実FS依存なしで24h境界とfailureを決定的に検証する。 |
| State atomicity | 既存audit lockとtransaction | recompose denied時のmutation 0を既存境界で保証する。 |
| Packaging | manifest-driven 6 harness projection | authored sourceを正本にし、dist手編集を防ぐ。 |
| Self-install | 既存4面closed list | package面と混同せず対象を拡張しない。 |
| Testing | `bun:test`と既存runner | pure seamをunit、filesystem/CLIをintegration-firstで検証する。 |

公開seamはFunctional Designの`classifyHelpIntent`、`inspectComposeMarker`、`assertRecomposeAllowed`に限定し、新signatureやfallbackを追加しない。

## 追加しない技術

- runtime dependency、network client、database、service、UI、daemon、background janitor。
- filesystem watcher、workspace sweeper、別TTL store、別reserved-vocabulary registry。
- new audit event、metrics/tracing backend、retention policy、service SLO。

## Source・test ownership

正本を`packages/framework/`へ置き、generatorで6 harnessへ同期する。adapter consumerとpure seam、characterization/negative fixtureを同じBoltで着地させ、dormant helperを先行導入しない。

testはhelp 3入口、marker 4経路、doctor read-only、recompose mutation 0を対照検証する。push前local lcovでpatch追加行未カバー0を確認し、spawn blind spotは実測後のin-process seamで覆う。waiverは既決証拠条件を満たす残余行だけに限定する。

## トレーサビリティ

各decisionは`business-rules.md`のBR-U04-01〜25、`business-logic-model.md`の責務境界/Verification flow、`requirements.md`のFR-1、NFR-3〜8、`technology-stack.md`のruntime・language・test・distribution構成に対応する。
