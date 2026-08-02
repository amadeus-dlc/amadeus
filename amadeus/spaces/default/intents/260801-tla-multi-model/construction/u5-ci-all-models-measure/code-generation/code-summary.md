# コード生成サマリ — u5-ci-all-models-measure

上流入力: `functional-design/`、`nfr-requirements/`、`nfr-design/`、`inception/requirements-analysis/requirements.md`、`inception/units-generation/unit-of-work.md`、`unit-of-work-story-map.md`。変更種別は Amadeus 自己開発の `self-feature`。

## 実装結果

- CI acceptance の既定対象を登録済み全モデルへ拡張し、`FormalElection` 6 回の後に `MirrorLifecycle` 6 回を逐次実行する `6 × N` 契約にした。`--model <name>` は単一モデルへの明示絞り込み、未登録名は fail-closed とした。
- `FormalElection` は既存 frozen 経路を保持し、`MirrorLifecycle` は loader が byte-pin した verified-source を固定 Docker / JDK / TLC jar で直接実行する。モデル別ディレクトリへ標準 artifact、cleanup、trace、計測統計を保存する。
- verifier はモデル名・順序、各モデル 6 回、completion marker、exit / timeout / cleanup、完全一致統計を検査する。MirrorLifecycle の pin は generated `208628`、distinct `89099`、queue `0`、depth `18`。
- diagnostic の既定も全モデルとし、skeleton は frozen の `FormalElection` のみに限定して verified-source の誤利用を明示拒否する。
- workflow は表示名と成功メッセージだけを全モデル表現へ更新した。`timeout-minutes: 30`、`permissions: contents: read`、`workflow_dispatch` 条件、run / verify コマンド行は不変。
- 正本 plugin と 8 配布面を `bun scripts/package.ts` で同期した。t406 と既存テストで runner、domain、artifact ownership、二層 port、CLI selector、diagnostic を固定した。

## TDD と実測

- 変更前 baseline: 既存関連 6 ファイル、`30 pass / 0 fail / 117 expect`。
- Red: runner がモデルを証跡化しない失敗、verified-source port が計測統計を返さない失敗を確認後に Green 化。
- 関連最終: 9 ファイル、`59 pass / 0 fail / 241 expect`。
- MirrorLifecycle diagnostic: Docker server `29.5.3`、exit `0`、timeout なし、残存 container `0`、`24494.361ms`。統計は pin と完全一致。
- 既定 all-model acceptance: `FormalElection × 6 → MirrorLifecycle × 6` の 12 回、verify `pass: true`、総 CLI `644215.468ms`。最大実行 `120247.522ms` で 190 秒 / run と 30 分 / workflow の両予算内、timeout 緩和なし。
- 詳細な環境、各モデルの min / max / sum、統計は `e2e-evidence.json` に保存した。

## 品質ゲート

| 検証 | 結果 |
|---|---|
| 関連 9 テストファイル | `59 pass / 0 fail` |
| `bun run typecheck` | exit `0` |
| `bun run lint` | exit `0`（既存 warning 369 / info 22、error 0） |
| `bun scripts/package.ts --check` | exit `0`（生成直後） |
| `bun run test:ci` | 719 files 中 3 files timeout、716 files pass |
| timeout 候補 4 ファイルを `bun test --timeout 120000` で再実行 | `129 pass / 0 fail / 1 skip` |

フルスイートの失敗数 3 は、30 秒を超えた wall-clock drift の `t-codex-hooks-migration` (`33.062s`)、`t225-upstream-v2-migration-preflight` (`35.367s`)、`t05-run-tests-parallel` (`31.317s`) の 3 ファイルと一致する。AGENTS.md の constrained VM 方針どおり 120 秒で個別再実行して全て通過したため、u5 回帰ではなく cold / 並列実行時の timeout と判定した。

## 逸脱・残リスク

- functional design にあった support probe 3 ファイルへの汎化変更は行わず、専用 t406 の決定的契約検査と実 Docker 12 回 acceptance で置換した。frozen 層への侵入を避けつつ、同じ acceptance 境界をより直接に実証する最小変更とした。
- `promote:self:check` は u1 所有の model-completeness / `tla-module-deps.ts` 配布 drift 10 件で失敗した。u5 の変更対象外のため修正・収録しない。
- package 実行時、u5 無関係の `dist/claude/.claude/tools/data/stage-graph.json` で `rules_in_context` 空化が発生した。plugin 配布同期とは無関係であるためコミット対象から除外する。
- 実 acceptance は macOS 上の固定 Docker での計測であり、GitHub hosted Ubuntu の `workflow_dispatch` 自体はこの Bolt から起動していない。ただし最大 run は予算に約 69.8 秒、全体は約 19.3 分の余裕がある。
- 非変更面の `tlc-toolchain.ts`、`fs-tlc-toolchain.ts`、`run-model-check-execution.ts`、`tla-arm.ts` は変更していない。
