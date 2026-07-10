# Re-scan 記録 — 260709-dynamic-test-size

> #707 契約(per-intent re-scan 記録)。差分ベース点の真実源はこのファイル(この intent 固有)。共有 `reverse-engineering-timestamp.md` は鮮度ポインタであってベース点ではない。

## スキャンメタデータ

- **base**: `9a2f5c7205795a255f258628710820def2ab3f8c`
  - 理由: 本 intent `260709-dynamic-test-size` に prior re-scan 記録が存在しないため、`re-scans/` 内で最新の observed(前 intent `260709-pbt-small-band` の `260709-pbt-small-band.md` に記録された observed)を差分ベースに採用した。#707 契約の「該当 intent の記録が無いときは直近 observed を base とする」に該当。
- **observed**: `24197d755a51712c1bfd6fa405f709c070c61f0d`
  - `git rev-parse HEAD` 実測(Developer スキャン・Architect 合成の双方で確認、現 HEAD)。
- **date**: 2026-07-09
- **intent**: `260709-dynamic-test-size`(#699 / #684 Phase D — テストランナーにおけるテストサイズの継続的動的計測)
- **手法**: diff-refresh(project.md 是正 cid:reverse-engineering:c1)。焦点領域は現行コードを実コード直読で file:line 確定。

## focus(スキャンスコープ)

- `tests/run-tests.ts` — per-file spawn・wall-clock 計測(`:724`/`:762`)・`.meta` 書き込み(`writeMeta` `:369-391`)・集約後削除(`aggregateTierResults` `:430`)・`printSizeMatrix`(`:895-948`)・exit-code 隔離(`:882-886`)
- `tests/lib/test-size.ts` — `SizeClassification` 安定出力契約(`:42-45`、L10-14)・`classifyTestSize`(`:49-62`)・`SIZE_ORDER`(`:28`)
- `tests/unit/t-test-size-drift.test.ts` — 静的ドリフトガード(declared < measured 検査)
- `tests/lib/bun-junit-to-meta.ts` — JUnit→meta 化、root `time` が唯一の実 wall-clock(`:182`)
- `.github/workflows/ci.yml` — CI 配線(`ubuntu-latest` `:22`、artifact upload `:75-84`)
- `tests/gen-coverage-registry.ts` — `covers:` join レジストリ(size/duration と直交)
- `tests/integration/t112.serial.test.ts` — scratch runner copy リスト制約(`:91-94`、`REAL_SIZE` `:52`)
- `package.json` — test/coverage スクリプト・devDependencies(fast-check 追加面)

## 差分の焦点影響(`9a2f5c72..24197d755`)

- `git diff --name-status 9a2f5c72..24197d755 -- ':!amadeus/' ':!dist/'` の実質コード差分は**5ファイルのみ**: `bun.lock`(M)/`package.json`(M、fast-check `^4.9.0` 追加のみ)/`tests/helpers/arbitraries/semver.ts`(A)/`tests/integration/t92.test.ts`(M、#709 の test-44 skip ガード)/`tests/unit/setup-semver.pbt.test.ts`(A)。すべて #721/#722 由来。
- **フォーカス面(1-8)への影響: 無し**。`run-tests.ts`/`test-size.ts`/`t-test-size-drift`/`bun-junit-to-meta.ts`/CI/`gen-coverage-registry.ts`/t112/test スクリプトはいずれも差分5ファイルに含まれず、前回スキャンの理解がそのまま有効。
- 新規 `.test.ts` 2件は `printSizeMatrix` の disk walk と `t-test-size-drift` の on-disk ガードが**次回実行時に自動で分類対象に含める**(両者ともハードコードリストなしのディスク走査)。ランナー機構の変更は不要。
- 結論: フォーカス領域は現行コード直読で足り、fast-check の devDependencies 追加のみ technology-stack.md へ反映した。
