# Scope Document — 260719-ballot-failclosed-amend

上流入力(consumes 全数): intent-statement.md、feasibility-assessment.md、constraint-register.md

## スコープ種別

`amadeus`(Self-hosted Amadeus framework development without infrastructure operations)— ユーザー明示決定(enhancement #1253 同梱のため bugfix でない。scope-definition:default-scope-amadeus / bugfix-scope-for-bug-intents の例外適用はユーザー指示による)。

## Must(すべて必須 — Should/Could は置かない)

feasibility-assessment.md の GO 判定と constraint-register.md C-1〜C-7 を前提に、公開契約(ballot 受理境界)を完結させる最小集合のみを Must とする(scope-definition:c2 の厳格 Won't 方式):

| # | 項目 | 由来 |
| --- | --- | --- |
| M-1 | `Ballot.parse` に submittedAt 様式検証を追加(regex+Date 二段、`invalid-timestamp` 級の fail-closed 分類)— 落ちる実証に `__NOW__` 級および「`new Date` が NaN にならない ISO 風文字列」を含む | #1252、C-3 |
| M-2 | 受理形は normalizeAt mint 正規形(seconds 精度 ISO-8601 UTC)と整合させ、既存正当経路の後方互換を維持(既存 corpus への遡及 sweep で両側実証) | #1252、R-2 |
| M-3 | amend ballot の提出経路(parse/write 側の `kind:"amend"` 対応+`ref` 検証)— original と共存し correction trail 維持(ADR-5 = C-7) | #1253 |
| M-4 | amend の tally 解決規則を design 段の選挙で裁定し、裁定どおり実装+閉包テスト固定(tally 無差別集計の二重計上を封鎖) | #1253、C-4/R-1 |
| M-5 | 検証 green 維持: `bun run typecheck` / `bun run lint` / `bash tests/run-tests.sh --ci`+PR 前 deslop・lcov 実測 | C-6 |

## Won't(明示除外)

| # | 除外項目 | 根拠 |
| --- | --- | --- |
| W-1 | `tests/unit/t238-election-record.test.ts` の変更 | e1 の #1226 intent が反転予定(C-2)。交差発生時のみ leader 報告のうえ直列化 |
| W-2 | `GoaLineCode` の複節拡張・圧縮 workaround 撤去 | e1 intent の E-GMERA3 裁定で別 Issue 化済み(他 intent の管轄) |
| W-3 | `parseGoaLine` / norm-metrics 系の変更 | #1226(e1 intent)の管轄 — 本 intent は election CLI 系のみ |
| W-4 | 配布フレームワーク(`packages/framework/`、`dist/`、self-install)への変更 | C-1。`scripts/` は配布外 |
| W-5 | verify 段の検査強化・timeline-order 検査の変更 | 受理段 fail-closed 化で上流封鎖するのが本 intent の方式(intent-statement 指標1)。verify 側は現状維持 |
| W-6 | 選挙運用(store 配置・--project 運用)の変更 | A-2 の現行運用を維持 |

## スコープ境界の判定規則

境界疑義が出たら「ballot 受理境界(model の parse / store の append / CLI の vote verb)の内側か」で判定する。内側=本 intent、外側=Issue 起票して leader へ報告(intent-first / Issue-first ノルムに従う)。逸脱は実装前停止・選挙(C-5)。
