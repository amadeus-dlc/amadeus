# Integration Test Instructions — 260719-cursor-complete-clear

上流入力(consumes 全数): code-generation-plan, code-summary

## 対象

回帰テスト本体(AC-2/AC-3 の実装、code-generation-plan §テスト):

- `bun test tests/integration/t243-post-complete-audit-stop.test.ts` — 7テスト: カーソル解放 / 他 intent カーソル温存 / 明示 intent 抑止+stderr advisory / lone-intent fallback 抑止 / unknown status 続行 / in-flight 非阻害 / fork→merge in-process(handleAuditMerge seam)
- `bun test tests/e2e/t07-audit-fork-merge.test.ts` — fork/merge の spawn 境界非退行
## フルスイートと閉包

- フル: `bash tests/run-tests.sh --ci` — 期待: RESULT: PASS / fail 0
- 閉包(origin repro verbatim): scratch workspace で complete-workflow → カーソル消滅・SENSOR_FIRED/実フック HUMAN_TURN 抑止・シャード行数不変(code-summary §Origin repro 閉包の手順を再適用)
