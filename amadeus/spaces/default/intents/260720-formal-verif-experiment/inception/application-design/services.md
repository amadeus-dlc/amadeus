# Services — 形式検証対照実験

## 上流入力とservice stance

`requirements.md` はrepo-localの対照実験を要求し、`architecture.md` は配布framework境界を守るよう求める。`component-inventory.md` の対象は既存のTypeScript/Bun選挙CLIであり、`team-practices.md` はreleaseやproduction deploymentを本intentに要求しない。このため、network service、AWS service、daemon、database、UI serviceは設けず、1つのlocal CLI orchestration serviceとpure library modulesで構成する。

## Formal Verification Experiment CLI

責務は順序制御であり、oracleのbusiness ruleや採否ロジックを重複実装しない。

| Command | Lifecycle | Communication | Writes |
| --- | --- | --- | --- |
| `authoring-start --arm <tla|ts>` | arm authoring開始 | sync local call | provenance event |
| `freeze --arm <tla|ts> --sha <sha>` | arm freeze検証 | sync git / test subprocess | provenance event |
| `fixture-seal` | coordinatorだけがfixtureを封印 | sync filesystem | sealed record |
| `fixture-reveal --arm ...` | freeze後に指定armへ開示 | sync filesystem | disclosure event |
| `fetch-tlc` | TLC jar取得・checksum検証 | HTTPS acquisition only | ignored cache + receipt |
| `run --arm ... --subject ...` | 1 cell実行 | sync subprocess | raw evidence |
| `benchmark --arm ...` | baseline + 全D-COUNTのfull suiteを1 warmup + 5 measured | sync subprocess | suite / cell raw timing samples |
| `evaluate` | matrix completeness / eligibility / Pareto | pure in-process | derived JSON |
| `report` | report生成とtrace verification | pure + filesystem read | final report |

すべて非対話で、明示input path、固定config、machine-readable JSONを受け渡す。subcommand失敗はnon-zero exitとtyped errorを返し、後続commandを自動実行しない。

## Orchestration pattern

中央orchestrationを採る。順序は `T start → T freeze → #1252 reveal → skeleton pass → S start → S freeze → manifest promotion → full-suite run → evaluate → report` であり、event choreographyは使わない。理由はblind開示順序とraw evidence completenessを単一のfail-closed state machineで強制する必要があるためである。

```text
Coordinator CLI
  ├─> Git/worktree verifier
  ├─> Arm T adapter ─> local Java/TLC process
  ├─> Arm S adapter ─> local Bun process
  ├─> Evidence Store ─> intent record
  └─> Evaluator ─> Report Renderer
```

text fallback: Coordinatorが唯一の順序所有者で、arm adapterはsubjectを検査して結果を返し、Evidence StoreとEvaluatorはraw evidenceを保存・評価する。

## External dependency lifecycle

TLC artifact取得だけがnetwork通信を持つ。URLは `https://github.com/tlaplus/tlaplus/releases/download/v1.7.4/tla2tools.jar`、SHA-256は `936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88` に固定する。取得後の検査runはnetworkを禁止し、checksum不一致・cache欠損を`HARNESS_ERROR`にする。

Arm Sはlockfileのfast-check 4.9.0とBunを使用する。Arm TはOpenJDK 26.0.1とTLA+ tools 1.7.4をprovenanceへ記録する。version drift時は同一実験の再測定ではなく、新revisionとして全cellを再実行する。

## Scaling / availability / security

- Scaling: 1 cellずつserial実行する。`TLC_WORKERS=1`とし、runner間のCPU競合による比較汚染を避ける。
- Availability: local experimentのためservice SLOなし。benchmark timeout 120秒はbaseline + 全D-COUNTの1 arm full suite単位であり、超過は当該suiteとarmを`HARNESS_ERROR`にする。retryで成功へ丸めない。
- Security: secret不要。fixtureはsyntheticまたは公開repository recordのみ。外部election storeへ接続しない。
- AWS / UI: 対象外。AWS support / design support観点では「追加resource 0」「user-facing surface 0」が最小かつ境界整合の設計である。
