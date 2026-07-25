# Security Test Instructions — mirror-auto-modes

## 攻撃面と上流トレース

各Unitの`nfr-requirements/security-requirements.md`と`code-generation-plan.md`／`code-summary.md`を上流とする。対象はconfig／state／remote response／repair input／projection pathをuntrusted dataとして扱うCLI・filesystem・`gh` process境界である。

## 実行方法

1. unit／integration回帰でboolean coercion、path traversal、symlink escape、duplicate key、forged permit、wrong repository、marker mismatch、stale prompt、repair replay、secret sentinel、capacity超過を検証する。
2. `bun run distribution:check`で6 dist、4 self-install、4文書のtoken／credential／absolute user path scanを実行する。
3. `bun run lint`、`bun tests/complexity-gate.ts --check`で静的品質gateを実行する。
4. `bun audit`でlockfile依存関係の既知脆弱性を照会し、結果をcode変更由来と既存依存由来に分離する。
5. `rg`でMirror正本の`eval`、shell文字列実行、background retry／polling、PR／merge／release／deploy権限の追加がないことを確認する。

## 判定と非適用

Critical／Highの新規脆弱性、secret露出、guard bypass、workspace外write、shell injection、remote mutationの追加実行をfailとする。HTTP service、browser UI、IaC、containerを追加していないためDAST、accessibility、IaC／image scanは根拠付きN/Aであり、実在するCLI／filesystem検査の代替にはしない。
