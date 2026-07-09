# Functional Design 質問 — dynamic-size-observation(#699)

> 方針レベルの判断(永続化先 / 執行姿勢 / 閾値帯 / バックエンド境界)は requirements 選挙(Q1〜Q4 = A、2026-07-09 全会一致)で既決。
> 本ファイルの質問は既決方針の機械的具体化であり、architect(lead persona)判断で確定する。根拠を併記し、architecture-reviewer の敵対的レビューとゲートで検証される。
> 上流: `../../../inception/requirements-analysis/requirements.md`(FR-1〜FR-6、NFR-1〜5)

## Q1. JSON レポートの出力パスとファイル名

A. `tests/logs/test-size-report.json`(gitignore 済みディレクトリを再利用)
B. `coverage/test-size-report.json`(coverage ディレクトリへ同居)
C. 新規ディレクトリ `tests/reports/` を新設し gitignore 追加
X. Other

[Answer]: A。`tests/logs/` は既に gitignore 済み(`.gitignore:26`)でランナーのログ置き場として意味論が確立。`coverage/` は Codecov/LCOV 専用の意味が確立しており(`ci.yml:75-84`)混載は変更理由の異なる資産の同居になる。新規ディレクトリは gitignore 変更を伴い最小差分に反する。

## Q2. size↔wall-clock 帯定義と drift 判定ロジックの配置

A. `tests/lib/test-size.ts` に追加 export(単一真実源の維持: 分類器と同居、SizeClassification 形状は不変のまま加算)
B. 新規 `tests/lib/test-size-dynamic.ts`(静的/動的の分離)
X. Other

[Answer]: A。#696 が `test-size.ts` を「a file's DERIVED size の単一真実源」(`test-size.ts:7`)と定義済みであり、wall-clock 帯は同じ「derived size」概念の動的側。分離すると SIZE_ORDER 等の共有定数が二重参照になり、canonical 1定義から導出(construction ガードレール)に反する。既存 export(classifyTestSize / parseSizeAnnotation / SIZE_ORDER / SIZE_VALUES)は不変で、追加 export のみ(FR-2 の安定契約要件)。t112 コピーリストは既に `test-size.ts` を含む(`t112.serial.test.ts:91-94`)ため新規伝播も不要。

## Q3. duration の収集点

A. `.meta` 削除(`run-tests.ts:430`)より前の集約時点でメモリ上に収集し、全 tier 完了後にレポート生成
B. `.meta` 削除を遅延させレポート生成後に削除(削除契約の変更)
X. Other

[Answer]: A。NFR-1(runner 契約の不可侵)と選挙 Q1 根拠(.meta 削除は既存契約)により B は不可。per-file duration は root JUnit `time`(`run-tests.ts:754-762` で parse)として集約時に既に手元にあるため、メモリ収集はゼロ追加計測で成立(FR-1)。

## Q4. 観測バックエンド seam の形状

A. `SizeObservationBackend` インターフェース: `name` + per-file 観測結果(`durationSeconds` 必須、将来の `dynamicSignals` はオプショナル)を返す。wall-clock バックエンドが初回消費者(runner の JUnit 実測を注入)
B. イベントフック型(onFileComplete コールバック登録)
X. Other

[Answer]: A。選挙 Q4 の付帯条件(wall-clock を初回消費者に)を最小面積で満たす。イベントフック型は runner 本体への結合点が増え、NFR-1 の隔離(try/catch 1箇所)を複数点に分散させる。将来の strace/eBPF は同じインターフェースの実装を追加し、レコードの `dynamicSignals` を埋める(スキーマは前方互換のオプショナル字段)。

## Q5. summary matrix への動的情報の表示形式

A. 既存 matrix の後に1行サマリ「wall-clock drift: N file(s)」を追加し、drift ファイルは file+宣言/実測帯を列挙(0 件でも「0」を表示 — FR-3 テスト可能条件)
B. matrix の各セルに drift 数を併記(表構造の変更)
X. Other

[Answer]: A。FR-3 のテスト可能条件(drift 0 でも表示)を最小変更で満たす。B は既存 matrix の消費者(人間の目視)に対する表構造変更で、#696 の観測性出力の安定を崩す。実装は既存の exit-code 隔離 wrap(`run-tests.ts:882-886`)の内側に置く(NFR-1)。
