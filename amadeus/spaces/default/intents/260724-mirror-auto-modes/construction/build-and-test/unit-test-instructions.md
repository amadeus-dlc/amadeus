# Unit Test Instructions — mirror-auto-modes

## 対象と上流トレース

各Unitの`code-generation-plan.md`と`code-summary.md`に列挙されたunit testを実行する。主対象はconfig／policy、repository／capability／gateway、state codec／reducer／repair／provenance、executor／coordinator／presentation、Projection Registryである。

- Contract/Policy: `t257`、`t268`
- Gateway: `t270`〜`t272`
- State/Provenance: `t274`〜`t277`
- Lifecycle: `t279`〜`t281`、`t283`
- Distribution: `t285`

## 実行方法

`bun test`へ対象unit fileの完全パスを渡す。各testは独立fixtureを所有し、production codeへtest modeを追加しない。期待値は被検実装から再計算せず、golden、decision table、metamorphic propertyで検証する。

全体回帰は`bun run test:all`に含める。成功条件はfail 0、各予定fileがrunner summaryへ出現し、happy pathに加えて最低2つのerror／edge caseが実行されることである。

## カバレッジ期待

公開contract、mode三値、invalid fail-closed、event identity、capability偽造拒否、state transition、repair replay、authorization、Registry path confinementを直接通す。line coverageだけでなく、remote-before guard、no-op、capacity、replay、unknown variantのbranchを重視する。
