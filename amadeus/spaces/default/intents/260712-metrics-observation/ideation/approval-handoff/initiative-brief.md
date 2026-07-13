# Initiative Brief — メトリクス定点観測(260712-metrics-observation)

## 一言サマリ

コード品質の**回帰防止ゲートしかない**現状に、**時系列の観測レイヤー**を追加する — 既存計測経路(lizard/lcov/git/ランナー SUMMARY)の出力を、リポジトリにコミットされる snapshot ファイルへ決定的に保存する薄い機構(scope=feature、Issue #921 起点・クロスレビュー 2/2)。

## ideation の結論(inception への引き継ぎ)

1. **方式**: 薄い Build+Codecov 温存のハイブリッド(market-research/build-vs-buy — 依存ゼロ・物差し統一・#921 要望形一致で SaaS 不採)
2. **実現可能性: 高**(feasibility — 全計測候補を実測裏取り。リスクは CI 書き戻し1点で release.yml 前例あり)
3. **スコープ**: In 5項 / Out 5項(可視化・アラート・間引き・遡及・SaaS)/ 測定可能な成功基準4点(S2=検証劇場ゼロ、S3=loud fail)
4. **体制**: conductor e2(ラウンドロビン+アフィニティ一致)、builder ≤4/intent、実装 PR 1名レビュー
5. **出力契約**: verdict 3分岐+exit code+アトミック書き込み(rough-mockups 正準部分、受け入れ基準の導出元)

## inception で確定すべき論点(委譲台帳の集約)

1. メトリクス選定と粒度(候補6種 — #921)+ **テスト層比率の collector 候補化(E-TP-RA Q2=A の相互参照 — test-pyramid が比率観測を本 intent へ委任)**
2. 保存形式(日付付き個別 JSON が競合安全側の第一候補)
3. トリガー(main マージ CI 第一候補 — 権限 workflow 設計込み)
4. snapshot への lcov 集計値の含否
5. スキーマの計測器疎結合+計測器バージョン記録
6. snapshot ツールの配置(tests/ か scripts/ か core/ — C2 の dist 同期要否が分かれる)

## リスクと緩和(承認判断材料 — approval-handoff:c1)

| リスク | 一次緩和 | 代替緩和 |
|---|---|---|
| CI 書き戻しの自己ループ(R1) | paths-ignore | `[skip ci]` コミットメッセージ / 専用トリガー分離 |
| リポジトリ肥大(R2) | 数 KB/snapshot の軽量スキーマ | 将来の間引きポリシー(バックログ B2 に留保済み) |
| 計測器ドリフト(R3) | snapshot に tool_version 記録 | 不連続点のマーカーフィールド追加(design 論点) |
| 計測失敗の silent skip(R4) | loud fail+アトミック書き込み(S3) | --check dry-run の CI 配線(モック3で契約化済み) |
