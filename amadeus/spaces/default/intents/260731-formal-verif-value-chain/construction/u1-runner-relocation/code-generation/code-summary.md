# Code Summary — u1-runner-relocation

上流入力(consumes 全数): unit-of-work, functional-design, nfr-design, bolt-plan

## 実装結果(bolt-u1-runner-relocation ブランチ、conductor へ --no-ff マージ済み)

- **T1**: 24 ファイル rename 追跡で移設(20 byte-identical、rename+edit は canonical.ts / tla-model-map.ts / node-ci-model-check-port.ts / run-skeleton-ci.ts の 4 件)。
- **T2**: byte-identical 複製+外部 importer 2 件切替(canonical.ts:5、tla-model-map.ts:13 — I2 閉包の機械的適用、conductor 承認済み)。
- **T3**: write⇔check 対称の複製同期を dist/dist:check へ配線。**落ちる実証実測**: 1 バイト注入 → `--check` exit 1(DIFFERS)→ revert → cmp identical → exit 0(不可分 1 セット、注入残置なし)。
- **T4**: ci.yml :584/:600 の 2 パスのみ差替。
- **T5**: stage 本文書換 → drop→compose 正規サイクル → 全 8 dist 面+staging+stage-graph.json 同期(手編集なし)。
- **T6**: 機械分類 remap 61 ファイル/165 置換(分類 D 除外)。
- **T7**: allowlist 14 remap/14 D-skip、baseline 2 remap/20 D-skip — FD スナップショットと完全一致、16 行全て path-only。
- **ゲート配線追加(申告逸脱・conductor 承認)**: plugins/*/tools を tsconfig/lint/MEASUREMENT_ROOTS へ配線(project.md ALWAYS「新設ツリーは同一 PR で lint+型検査配線」の執行)。
- **u2 統合実行**(ユーザー裁定 B1={u1+u2}): 残骸 30 ファイル削除・参照テスト 3 値判定処理・台帳 D エントリ削除・`test -d scripts/formal-verif` exit 1(I2 成立)。コミット列: 4f0b27355(移設)→ bd43bfa15(削除)→ 1458f1cc7(drift 実証)→ baa88f754(allowlist 復元)。

## 検証(conductor 引き取り再実測、exit code 個別捕捉)

| コマンド | exit |
|---|---|
| bun run typecheck | 0 |
| bun run lint | 0 |
| bun run dist:check | 0 |
| bun run promote:self:check | 0 |
| bun tests/gen-coverage-registry.ts --check | 0 |
| bash tests/run-tests.sh --ci(マージ前 worktree) | 1(fail=1: t356 — base 版差起因を無改変 base で byte 同一再現、bt-20260730-2) |
| bash tests/run-tests.sh --ci(origin/main 再接地後) | **0(fail 0)** |

- I4 grep AC: 4 plugin 面で `scripts/formal-verif` 0 hit ✓。swarm check: converged ✓ tampered=false。
- 既存欠陥の隔離: stage-graph 既存 drift 2 件を diff 外へ revert(→ #1863 起票)、stale allowlist pin(→ #1864 起票、origin/main 側修正を再接地マージで継承し旧 1838 ピンを除去)。
