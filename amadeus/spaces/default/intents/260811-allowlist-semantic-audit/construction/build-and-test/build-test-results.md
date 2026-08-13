上流入力(consumes 全数): code-generation-plan.md / code-summary.md

# Build and Test Results — 260811-allowlist-semantic-audit

すべて conductor が最終変更後に 1 コマンドずつ直書きで実行し、exit code を個別に読んだ
(`cid:code-generation:cg-no-shell-var-command-loop`)。数値は実出力からの転記であり、
記憶や見込みで書いていない(`cid:requirements-analysis:numbers-from-command-output-only`)。

**測定 ref**: `191dfac05`(指示書コミット)+ 監査シャードのチェックポイント。
`git rev-parse HEAD` の実出力を base とする。

## 実行結果

| コマンド | exit | 出力の要点 |
|---|---|---|
| `bun run typecheck` | 0 | `tsc --noEmit` × 2(本体・tests) |
| `bun run lint` | 0 | `Checked 1788 files` / warnings 459・infos 17(いずれも既存。変更ファイルへの新規指摘なし) |
| `bun run build` | 0 | 実行後 `git status --porcelain` に生成物由来の差分なし(追跡ファイル不変) |
| `bash tests/run-tests.sh --ci` | 0 | `Failed files: 0` / `Total assertions: 13225` / `Failed assertions: 0` / `RESULT: PASS` |
| `bun run coverage:ci` | 0 | `Failed files: 0` / `Total assertions: 13225` / `Failed assertions: 0` / `RESULT: PASS` |
| `bun tests/coverage-patch-gate.ts --check` | 0 | `Patch coverage gate: PASS` / `measured added lines: 225, covered: 225, allowlisted: 0, uncovered: 0` |
| `bun tests/coverage-project-gate.ts --check` | 0 | `OK — current 93.1008%, absolute minimum 90.00%, merge-base 40.9395%, relative tolerance 0.02pp, delta 52.1613pp` |

## 失敗の詳細

**なし** — 本ステージの実行ではビルド・テストとも失敗ゼロ。したがって
`build-instructions.md` にトラブルシューティング節を追加していない(Depth Minimal の条件)。

ただし patch gate の初回実行は `working tree is dirty` で拒否された。これは失敗ではなく
**設計どおりの fail-closed** である — コミット済み diff と LCOV が同じスナップショットを
記述していることを検証できないため、判定自体を拒む。監査シャードをコミットして再実行し PASS。

## 被覆

- **patch**: 追加行 225 行すべてが被覆済み。`allowlisted: 0` — **新設ガードのために新しい免除を
  1 件も足していない**。#1622 が扱う対象そのものを増やさずに済んだ点が本 intent の実効を示す
- **project**: 93.1008%(絶対下限 90.00% / merge-base 相対の許容低下幅 0.02pp に対し delta +52.1613pp)

## 帰属の記録(過去 run の赤について)

本 run は 0 fail だが、同一コミット系列での過去 run に 2 度の赤があった。いずれも本変更由来では
ないと帰属済みで、記録として残す。

| run | 赤 | 失敗署名 | 帰属 |
|---|---|---|---|
| code-generation 中の 2 回目 | `t222` / `t227` の 2 files | `git add -A failed: error: unable to create temporary file: Invalid argument` | 並列実行下の一時ファイル生成失敗。当該 2 ファイル単独では 44 pass / 0 fail、直後のフル再実行で 0 fail |
| CI の初回 | `Typecheck` ジョブ | `fatal: unable to access ...: server certificate verification failed` | `actions/checkout` 段のフレーク。`tsc` は 1 度も走っていない。再実行で green |

**証拠の限界**: いずれも変更後ツリー上の観測であり、変更前コミットを同一の並列条件・同一の
runner で回す対照は取っていない。状況証拠として、赤くなったファイルは本変更の diff に含まれない。
