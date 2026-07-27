# Build Test Results

上流入力(consumes 全数): requirements.md、code-generation-plan.md、code-summary.md — 検証コマンド集合の実行結果記録(全数値はコマンド出力からの転記)。

実行環境: worktree plugin-dev(macOS、bun 1.3.13)。実行日: 2026-07-27。並列度: run-tests 既定 -P=min(cores,4)。

## 実行結果(conductor 最終実行+3者一致確認)

| # | コマンド | exit | 出力(転記) |
| --- | --- | --- | --- |
| 1 | `bun run typecheck` | 0 | tsc --noEmit ×2 クリーン |
| 2 | `bun run lint` | 0 | Checked 946 files、warning 309(既存ベースライン・増減なし) |
| 3 | `bun run dist:check` | 0 | 7ハーネス全て `--check: OK` |
| 4 | `bun run promote:self:check` | 0 | self-install 5面 in sync |
| 5 | `bash tests/run-tests.sh --ci` | 0 | **608 files / 8249 assertions / Failed 0 / RESULT: PASS**(builder・reviewer の独立実行と件数完全一致) |
| 6 | `bun test tests/e2e/t341-plugin-conformance-journey.serial.test.ts` | 0 | 3 pass / 39 expect / 0.76〜0.95秒 |
| 7 | `bun run coverage:ci -- -P 4` | 0 | RESULT: PASS(coverage lcov 生成) |
| 8 | `AMADEUS_PATCH_BASE_REF=origin/main bun tests/coverage-patch-gate.ts --check` | 0 | **measured added lines: 57, covered: 57, allowlisted: 0, uncovered: 0**(local-lcov-pre-push 充足) |
| 9 | `bun tests/coverage-project-gate.ts --check` | 0 | current 85.3667% / baseline 40.9395% / delta +44.4272pp |
| 10 | `bun tests/gen-coverage-registry.ts --check` | 0 | registry 整合 |
| 11 | `bun tests/complexity-gate.ts --check` | 0 | 複雑度ゲート green |

## 落ちる実証(5面、いずれも注入→赤→byte 復元の1セット完遂)

1. FR-7: hook を旧 projectDir 解決へ巻き戻し → E2E 2 fail → 復元 green
2. FR-8: spawnRecompile を runtime のみへ巻き戻し → E2E 2 fail → 復元 green
3. FR-5: 上記状態で CI ジョブ同一コマンド exit 1 → 復元 exit 0
4. FR-6: doc へ count word 注入 → t132 3 fail → byte 復元 8/8
5. FR-1: 誤名定数の再注入 → 再導入検知ガード赤 → 復元 green

## Issue 閉包(起票時再現手順の verbatim 再適用 — fix-review-replays-origin-repro)

- #1585: 空ホスト standalone doctor → 修正前 stdout 0バイト(Red 実測)/ 修正後 `- Plugins: 0 installed`(reviewer 独立再現)
- #1586: compose→drop → 修正前 `plugins/<name>/stages/` 残存(Red 実測)/ 修正後 FS 完全一致(reviewer 独立再現)
- #1575: 重複定義 grep → 単一 canonical のみ(reviewer 独立 grep)
- #1590: full CI → 修正前 t132 3 fail / 修正後 exit 0
- #1591/#1592: 修正前「INSTALL 手順どおり→Unknown stage」(builder scratch 実測)/ 修正後 E2E (a)〜(d) green

## セキュリティ面の実測

- 正本+scripts の変更行 grep(trust|digest|grant)= **0 hit**(`git diff 0c4709102..HEAD -- packages/framework scripts` の +/- 行)
- `bun.lock` 差分 = 0(依存追加なし)

## wall-clock drift 注記

coverage 実行で既存2テスト(t-codex-hooks-migration 37.5s / t225 30.9s)が declared=medium measured=large の drift 注記 — 本 intent の変更外(advisory、ゲート非ブロック)。
