# Code Summary — U1 tla-evidence-foundation(Bolt 1、walking skeleton)

上流入力(consumes 全数): U1 functional-design / nfr-design 成果物(READY 確定)、code-generation-plan.md。

## 実装結果(実測)

- ブランチ: `bolt-tla-evidence-foundation`(base = main 257117d68)、PR [#2239](https://github.com/amadeus-dlc/amadeus/pull/2239)
- コミット(TDD スライス 4 件): 461d0137c(identity 抽出 + digest 比較)→ b409f349c(envelope codec + 検証 + head 解決)→ 9749358b6(atomic store build/verify/read/list/head)→ 821f8ce0b(CLI サブコマンド + manifest 登録)
- 変更: 7 files、+1,685 / -1
- 新設: `plugins/formal-model-check/tools/tla-evidence.ts`(C2+C4 library)、`plugins/formal-model-check/tools/tla-authoring.ts`(CLI)、テスト t436(unit)/ t437(unit)/ t438(integration)/ t439(integration)

## 検証(実測 exit code)

- worktree solo: `bun run typecheck` = 0、`bun run lint` = 0、`bash tests/run-tests.sh --ci` = RESULT: PASS(conductor による solo 再実行で確定 — 初回 FAIL は並行スイート負荷起因の size 計測超過の偽赤と対照実測で帰属)
- referee: `amadeus-swarm check tla-evidence-foundation` converged=true / tampered=false(check-cmd = typecheck+lint。60 秒 timeout 制約のためフルスイートは solo 実測で代替)
- U6 との統合ツリー(conductor branch): typecheck 0 / lint 0 / full CI RESULT: PASS(stale node_modules 起因の偽赤を bun install で解消後)
- `bun run build` 再現性 / source-only: green

## 逸脱

なし(builder 報告および conductor の diff 検分で確認 — 契約からの無申告逸脱なし)。
