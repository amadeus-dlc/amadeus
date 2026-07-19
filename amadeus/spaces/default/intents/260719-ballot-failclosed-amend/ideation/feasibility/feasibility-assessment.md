# Feasibility Assessment — 260719-ballot-failclosed-amend

上流入力(consumes 全数): intent-statement.md

## 判定: GO

intent-statement.md の2目標(#1252 受理段 fail-closed 化 / #1253 amend 提出経路)はいずれも既存 seam の内側で実装可能であり、外部依存・新規基盤は不要。測定 ref: worktree HEAD(本ステージ実施時点、`git branch --show-current` = team/20260719-231310-08a0/engineer-2)。

## 技術的実現可能性(実測)

### #1252 — submittedAt 様式検証

- 挿入点は既存の 5 分類 fail-closed 検証(`scripts/amadeus-election-model.ts:184-204 Ballot.parse`)— 分類追加は同関数内の 1 分岐追加で、既存エラー分類様式(`BallotError` union)に整合する。
- e4 クロスレビュー所見どおり `new Date` 単独では日付のみ入力(`2026-07-19`)が通るため、regex(seconds 精度 ISO-8601 UTC 形)+ `Date` parse の二段検証が必要 — 対照実装は `normalizeAt`(`scripts/amadeus-election-transport.ts:88-92`)の正規形コメント(`YYYY-MM-DDThh:mm:ssZ`)から導出可能。
- 落ちる実証: e1 所見の「NaN にならない ISO 風文字列」ケースを含む(例は実装時に fixture 化)。

### #1253 — amend 提出経路

- `AmendBallot` 型(`scripts/amadeus-election-model.ts:121-132`)と store の amend 共存受理(`scripts/amadeus-election-store.ts:122-133` — duplicate 判定から amend を除外済み)は実装済みで、欠けているのは parse/write 側のみ(`Ballot.parse` が `kind` を読まず常に original を返す)。
- **重要実測**: `tally`(`scripts/amadeus-election-model.ts:321-338`)は ballots を無差別集計する — amend が original と共存した場合、同一投票者の票が二重計上される。**amend 解決規則(tally 側)の設計裁定なしに write 経路だけ開けると集計が壊れる**ため、#1253 は「parse/write 拡張+tally 解決規則」を一体で設計する必要がある(design 段の選挙事項 — intent-capture diary で予告済み)。

## テスト面(実測)

選挙系テストは 9 ファイル実在(`grep -l` 実測): unit t234(model)/ t238(record)/ t239(transport)、integration t235(store)/ t236(loop)/ t240(transport)/ t242(skill-vocabulary)、e2e t237(walking-skeleton)/ t241(machine-executor)。本 intent の主修正面(model/store/CLI)は t234 / t235 / t236 が直接消費面。**t238 は e1 の #1226 intent が反転予定 — 本 intent の修正対象外(交差回避方針は intent-statement.md 記載どおり)**。

## 検証コマンド(実在確認)

`bun run typecheck`(tsconfig + tests)、`bun run lint`(Biome は scripts/ を対象に含む — package.json 実測)、`bash tests/run-tests.sh --ci`。配布面(dist/self-install)への影響なし — `scripts/` は repo ローカルで配布外(W-04、gh-scripts-boundary と同区画)。
