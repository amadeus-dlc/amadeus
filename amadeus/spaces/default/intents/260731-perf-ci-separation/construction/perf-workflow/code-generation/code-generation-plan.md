# Code Generation Plan — U2 perf-workflow

上流入力(consumes 全数): business-logic-model.md、business-rules.md、domain-entities.md(U2 FD)

## 実行計画

1. `.github/workflows/perf.yml` を business-logic-model.md ロジック1〜3 の仕様どおり新設(1ファイルのみ、ci.yml 無接触 — BR-U2 群)
2. ci.yml :224-277 の benchmark/aggregate step 列を忠実移植し、意図的差分を申告表に固定
3. 静的検証(yaml parse / timeout 3宣言 / cron 実文 / ci.yml diff 空 / typecheck / lint / dist:check)
4. マージ後に workflow_dispatch で動的検証(AC-2)

## 実行形態

swarm(batch 2)worktree 分離、builder subagent 1名、branch bolt-perf-workflow。
