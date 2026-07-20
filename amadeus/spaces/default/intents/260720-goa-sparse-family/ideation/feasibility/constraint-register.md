# Constraint Register — 260720-goa-sparse-family

上流入力(consumes 全数): intent-statement.md、feasibility-assessment.md

## 制約一覧

| ID | 制約 | 種別 | 根拠 |
|---|---|---|---|
| C-1 | #1254 の方式((a)/(b)/(c))は RA 選挙で裁定 — 単独決定禁止 | プロセス | ディスパッチ要件(5)+E-GMERA1 の「集計実装時再裁定」委譲 |
| C-2 | 圧縮形 record(58 選挙 dir 規模)の読み側後方互換の要否は設計裁定 | 設計 | E-GMERA3 留保(t238:102 の扱い明記)+本ステージ実測 |
| C-3 | ECODE_RE 複節化は count 不変(189=189 実測)を対照テストで固定 | 検証 | #1257 クロスレビューの count-only 消費確定 |
| C-4 | norm-metrics は core 正本 — dist×6+self-install 再生成+drift guard 必須 | 配布 | Mandated(dist:check/promote:self:check) |
| C-5 | e2 #1267 との関数単位非交差の維持(変動時即時相互通知) | 並行 | 2026-07-20 02:50Z 相互合意 |
| C-6 | 逸脱は実装前停止・選挙裁定 | プロセス | deviation-stop-before-implement |
| C-7 | スパース受理を実装する場合、bin 段拡張は E-PM10D の範囲判定対象外(trusted repo ファイル入力)だが、falling 実証は corpus 全数 sweep 両側で行う | 検証 | corpus-sweep-for-new-guards |

## 引き継ぎ

C-1/C-2 は requirements の選挙へ、C-3/C-7 は build-and-test の検証手順へ、C-4/C-5/C-6 は code-generation の定型へ。
