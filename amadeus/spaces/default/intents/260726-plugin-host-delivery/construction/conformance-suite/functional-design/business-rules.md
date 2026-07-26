# Business Rules — U7 conformance-suite

> 上流入力(consumes 全数): unit-of-work、unit-of-work-story-map、requirements、components、component-methods、services

## BR 一覧

- **BR-U7-1(32/32 被覆)**: 追跡表は上流 32 ケース全行を持ち、各行の disposition は 3 値のいずれか+n-a は根拠必須(requirements FR-8 合否。検証: 行数 count=32+disposition 空欄 0 の機械検査)
- **BR-U7-2(表が先)**: テスト実装は追跡表確定後(検証: 表のコミットがテスト追加コミットに先行 — bolt-plan Bolt 7 順序)
- **BR-U7-3(層別)**: compose-semantics 層は 1 回実行、per-harness 層は対応面別。同一挙動のテスト二重実装禁止 — U2-U6 の BR 検証テストと共有し追跡表から参照(components.md C7。per-harness 層の期待値は component-methods.md の C1-C5 契約文からの転記 — services.md の単発実行モデルの範囲。検証: covered-existing 引用の実在+意味被覆レビュー)
- **BR-U7-4(実起動)**: per-harness trigger 面は native hook 実起動、不能面は文書化された手動 fallback E2E — いずれも期待値固定(暗黙成功禁止。U4 BR-U4-3 と共有)
- **BR-U7-5(レポート導出)**: ConformanceReportSection の suiteResult はテスト実行 exit code からの導出のみ。ハードコード・自己参照比較は不合格(検証劇場 Forbidden。検証: 落ちる実証 — 意図的 red 状態でレポートが red を示すこと)
- **BR-U7-6(CI 時間)**: 編入前後の CI 実行時間を実測し増分を成果物へ転記(numbers-from-command-output-only。検証: 計測コマンド併記)
- **BR-U7-7(引用様式)**: テスト引用はフルパス+可能ならシンボル(tNNN 短形禁止 — 同番号複数ファイルの誤解決防止)
- **BR-U7-8(pin 固定)**: 上流参照は commit `29a31f78` 固定。上流の後続変更は本 intent で追わない(requirements A-4。検証: 追跡表ヘッダの pin 記載)

## 検証への trace

BR-U7-1/2/6/8 は成果物・コミット列の機械検査、BR-U7-3/4 は per-harness テスト設計、BR-U7-5 は落ちる実証必須(注入は runtime 消費行へ — inject-runtime-consumed-lines)。
