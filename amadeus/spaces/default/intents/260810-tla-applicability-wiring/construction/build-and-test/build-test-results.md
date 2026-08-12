# Build & Test Results — 260810-tla-applicability-wiring

上流入力（consumes 全数）: `code-generation-plan.md`（検証コマンド（完了条件）節の合否条件を消費）、`code-summary.md`（CG 段の検証実測との突合対象として消費）

## ローカル実測（B&T 段の fresh 再実行、head = `78299b9fb`、2026-08-10）

| 検証 | コマンド | 実測 exit | 結果 |
|---|---|---|---|
| 型検査 | `bun run typecheck` | **0** | PASS |
| リンター | `bun run lint` | **0** | PASS（Biome、1731 files） |
| 対象スイート（unit 3 + integration 11 = 14 ファイル） | `bun test <14 paths> --timeout=30000` | **0** | **201 pass / 0 fail / 726 expect**、`Ran 201 tests across 14 files`（宣言 14 = 実行 14 — 母集団一致を runner 出力で確認、`cid:build-and-test:test-path-set-completeness`） |
| self-install 再生成 | `bun run build` → `git status --porcelain -- packages plugins tests docs` | **0** / 0 行 | PASS（tracked 不変） |

exit code はすべて非パイプで取得（`cid:code-generation:no-exit-capture-through-pipe`）。coverage 計測はローカルで実行しない（`cid:code-generation:local-lcov-pre-push` — PR CI を正とする。並行 worktree との単独所有者制約にも整合）。

## PR CI 実測（正規判定面、PR #2779）

| Check | 結果 | 根拠 run |
|---|---|---|
| Typecheck / Lint and complexity / Tests（full smoke+unit+integration）/ Reproducible build / Source-only and graph invariants / Plugin conformance E2E / Intent Mirror distribution contract | **全 pass** | run 31350346815（head `78299b9fb`） |
| Coverage Report (head) — Patch gate + Project gate | **pass**（初回 t224 フレークを 1 回再実行で回復 — 下記） | 同 run（rerun） |
| 集約 CI Success | **pass** | `gh pr checks 2779` = pass 13 / skipping 2 / fail 0 |

- Patch gate 経過: round 3 で `measured added lines: 185, covered: 181, uncovered: 4` → t113（handoff_stage validator 負側）+ t524（io-failure 注入）の追加で 4 行を実カバー（allowlist 追加ゼロ）→ round 4 pass。
- フレーク帰属（`cid:code-generation:rerun-red-reattribution`）: round 4 初回の `t224-upstream-v2-migration-cli:1669` 赤は (a) coverage 計装ジョブのみで非計装 Tests ジョブは green (b) round 3 では非発現 (c) ローカル `bun test t224` = 74 pass / 0 fail / exit 0（110.3 秒） (d) 本 PR の diff と患部（upstream 移行面）が非交差 — の 4 点で load フレークと帰属し、1 回のみ再実行 → green。

## 受け入れ基準の充足（FR 対応）

- FR-1〜FR-4 / FR-6 / FR-7: 対応テスト（t524〜t529）が AC の述語どおり green（integration-test-instructions.md の対応表）。
- FR-5（着地時に宣言ファイル・store を作らない）: `find . -name authoring-subjects.json`（node_modules 除外）= 0 件、`specs/tla-evidence` 不在を実測。さらに**本ワークフロー自身が生きた実証** — 本 intent の RA / FD 相当 / B&T checkpoint はすべて従前どおり進行した（handoff 宣言追加後も no-hold 素通り = 段階導入の非破壊性）。
- 落ちる実証: t528 の正負両側 + base-checkout 対角（code-summary の Red/Green 表）。t524 の io-failure 注入は catch 内 rmSync の実潜在バグを検出・是正済み（同根 #2784 起票）。

## 判定

**PASS（無条件 READY 相当）** — 全 blocking gate green、未検証面のうち受け入れ基準内のものはゼロ。基準外の申し送りは build-and-test-summary.md に列挙（`cid:build-and-test:c2-unconditional-ready-boundary`）。
