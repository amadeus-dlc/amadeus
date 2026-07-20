# Decision Log — 260719-ballot-failclosed-amend(ideation)

上流入力(consumes 全数): intent-statement.md、scope-document.md、intent-backlog.md、feasibility-assessment.md、constraint-register.md

## 決定一覧

| # | 決定 | 根拠・出典 | 種別 |
| --- | --- | --- | --- |
| D-01 | #1252+#1253 を同一 intent(scope=amadeus)で修正 | ユーザー承認済み編成、leader ディスパッチ 2026-07-19T15:00:57Z | ユーザー決定 |
| D-02 | 修正面は `scripts/amadeus-election-*.ts` 系+テストに限定、t238 は e1 管轄で除外 | ディスパッチ要件(4)、scope-document W-1〜W-4 | ユーザー決定(既決) |
| D-03 | submittedAt 検証は regex+Date の二段、落ちる実証に ISO 風 NaN 非該当文字列を含む | #1252 クロスレビュー所見(e1/e4)、ディスパッチ要件(3) | クロスレビュー成立 |
| D-04 | intent-capture 4問・feasibility 2問・scope-definition 2問は全て E-OC1 選挙不要判定(leader 承認 15:04:05Z / 15:10:57Z / 15:15:01Z) | 各 questions ファイルヘッダ | E-OC1 |
| D-05 | amend tally 解決規則は design 段の選挙で裁定 — 裁定なしに write 経路を開けない(tally 無差別集計の二重計上実測) | feasibility 実測(model.ts:321-338)、C-4/R-1/D-1 | プロセス固定 |
| D-06 | バックログは risk-first(B-3 裁定 → B-2 実装)、B-1 は独立先行可 | scope-definition Q2(E-OC1) | 既決様式適用 |
| D-07 | §13 は intent-capture(E-BFAIC 2-0)・feasibility(E-BFAFS 2-0)・scope-definition(E-BFASD 2-0)いずれも 0件で可 | leader 開票通知(agmsg 15:08:09Z / 15:13:18Z / 15:17:07Z) | 選挙裁定 |
| D-08 | ステージゲートは常任グラント 22d74683(stage-gates、期限 18:47:55Z、phase-boundary 除外)で approve — 本 approval-handoff は phase boundary のため per-gate delegate を leader へ依頼する | GRANT_ISSUED 取込コミット(4314c2481 cherry-pick)、standing-approval-scope-limit | ゲート執行 |

## 未決事項(Inception 以降へ)

- amend tally 解決規則の具体形(per-voter 最新 amend 優先か等)— design 段選挙(D-05)。
- submittedAt 受理形の許容幅(mint 正規形限定 vs ISO-8601 拡張形)— requirements で確定(initiative-brief R-2 代替緩和)。
