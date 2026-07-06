# コード生成サマリ — unit: runtime-graph-registration

対象 Issue: [#558](https://github.com/amadeus-dlc/amadeus/issues/558)

## 変更ファイル

| ファイル | FR | 内容 |
|---|---|---|
| `.agents/amadeus/hooks/amadeus-runtime-compile.ts` | FR-1 | command filter regex 3 本の path alternation へ `.agents/amadeus` を追加（transition tool / orchestrate report / runtime 再帰ガード） |
| `.agents/amadeus/tools/amadeus-learnings.ts` | FR-2 | `readRuntimeStageRow` を tryRead + 自己修復 wrapper へ分割。graph 不在・malformed・slug 不在時に 1 回だけ再 compile → 再解決。spawn 失敗・exit 非 0・再解決不能はすべて復旧手順つき fail(1)（無言 fail なし） |
| `dev-scripts/evals/hooks-state-bugfix/check.ts` | FR-1.2 | runtimeCompileScenario + 4 ケース（RED 先行: .agents 経由 2 ケースが実装前 FAIL） |
| `dev-scripts/evals/engine-e2e/check.ts` | FR-2.3 | #558 節（(a) 自己修復成立、(b) 復旧手順つきエラー） |
| `dev-scripts/data/parity-map.json` | FR-3 | engineFileExceptions へ `hooks/aidlc-runtime-compile.ts` 追加、exceptions へ #558 理由 entry（learnings 含む）追記 |

## TDD 証跡

| FR | RED | GREEN |
|---|---|---|
| FR-1 | hooks-state-bugfix #558 の .agents 経由 2 ケースが実装前 FAIL（`{"exitCode":0,"graphExists":false}`）。対照 2 ケース（.claude 経由・再帰ガード）は実装前から pass | 4/4 ok |
| FR-2 | 実装が e2e 追加より先行したため遡及 RED: learnings 変更を git stash → #558a が旧エラー `runtime-graph.json not found`（復旧手順なし = #558b の文言検査も不成立）で FAIL → pop → 全 GREEN（Testing Posture c6 の手順） | engine-e2e ok（#558a/#558b 4 検査） |

## FR-3 実測記録

- `hooks/aidlc-runtime-compile.ts`: engineFileExceptions 未宣言 → 追加した。
- `tools/aidlc-learnings.ts`: 宣言済み → exceptions へ #558 理由 entry を追記した。
- skills/ 正準: エンジン tools/hooks に正準コピーなし = 反映対象なし（find 実測、#559 と同判断）。

## NFR-1 記録（#559 B002 との整合）

`git show 076c48de --stat` の実測: B002 の変更は validator 4 ファイル + eval 1 ファイルで `amadeus-learnings.ts` に非接触。本 Intent の learnings 変更と衝突しない。

## 検証結果

- `npm run typecheck`: pass
- `npm run parity:check`: ok（39 skills、199 engine files、基準 commit b67798c3）
- `npm run test:all`: exit 0（2026-07-06T07:11:16Z、hooks-state-bugfix / engine-e2e の新ケース含む）
- validator（Intent 指定）: commit 後に実行し build-and-test で最終記録

## 逸脱

- FR-2 の実装順序が eval 先行の原則から外れたため、遡及 RED で検出力を証明した（diary の Deviations と plan の Step 4 に記録）。
