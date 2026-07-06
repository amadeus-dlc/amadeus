# Build and Test Results

Unit: persist-cid-metamain
実施日: 2026-07-06（UTC）
実施環境: engineer3 worktree（branch: eng3/issue-504-507-bugfix、基点 origin/main = 616d063e）

## 結果

| 検証 | コマンド | 結果 |
|---|---|---|
| 型検査 | `npm run typecheck` | pass（エラーなし） |
| 専用 eval | `npm run test:it:persist-cid-metamain` | pass（34 項目すべて ok） |
| エンジン sandbox e2e | `npm run test:it:engine-e2e` | pass（CLI 挙動の退行なし） |
| parity | `npm run parity:check` | pass（38 skills、197 engine files） |
| lint | `npm run lint:check` | pass |
| repo 標準検証 | `npm run test:all` | pass（exit 0） |
| record 構造検証 | `bun .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 260705-persist-cid-metamain` | pass |

## TDD 証跡（RED → GREEN）

- B001: 修正前に「別 Intent の同名 candidate_id が無言 no-op」「already_present フィールド不在」で FAIL → 修正後 GREEN。
- B002: 修正前に「import で 5 ファイルとも exit 1」「全 tools 走査で未ガード 5 件」で FAIL → 修正後 GREEN（usage エラーと exit code は修正前後で完全一致）。

## reviewer

- iteration 1: READY（eval 34 項目・typecheck・parity に加え、activeIntent null 経路、dirName の正規表現特殊文字、sensor 側非影響、走査の非トートロジー性を検証。non-blocking 1 件 = stage-protocol.md §13 の marker 形式記載は本 Intent 内で整合更新し parity 宣言済み）。
