# スコープ定義 — メトリクス定点観測(260712-metrics-observation)

> 上流: Issue #921(クロスレビュー 2/2)・intent-statement・market-research(薄い Build+Codecov 温存)・feasibility(実現可能性 高)。scope=feature。

## In Scope(本 intent で出荷する範囲)

1. **メトリクス snapshot の計測・保存機構**: 既存計測経路(lizard 経路・lcov・git/静的走査)の出力を、リポジトリにコミットされるファイルへ決定的に書き出すツール(メトリクス選定・スキーマ・保存形式は requirements/design で確定 — #921 委譲)
2. **トリガー配線**: 選定されたトリガー(main マージ CI を第一候補 — market-trends §4)の workflow/権限設計と配線(release.yml 前例踏襲)
3. **loud-fail 契約**: 計測失敗時に黙って古い値を残さない(constraint C3、落ちる実証つき)
4. **snapshot スキーマの計測器バージョン記録**(RAID R3 の緩和)
5. **既存スイートとの共存**: 全既存ゲート green 維持、CI 時間の実質非増(feasibility 実測前提)

## Out of Scope(明示除外)

- **可視化(グラフ/ダッシュボード)** — #921 論点欄どおり将来判断。カバレッジのトレンドは Codecov 既保有で充足
- **アラート/通知**(閾値監視はゲートの責務 — 本 intent は観測)
- **snapshot の間引き・保持ポリシー**(RAID R2 — 肥大が顕在化した時点の将来判断、E-L62 様式で留保)
- **過去時点の遡及計測**(履歴の逆算生成はしない — 観測開始時点から前向きに蓄積)
- **外部品質 SaaS の導入**(build-vs-buy で不採済み)

## 成功基準(測定可能)

- S1: main への対象マージ後、snapshot ファイルがリポジトリに自動コミットされる(または選定トリガーで決定的に生成される)
- S2: snapshot の全値が実計測の出力から導出される(検証劇場ゼロ — レビューで実行由来を確認可能)
- S3: 計測失敗時は CI が loud に fail し、部分的/古い snapshot が正として残らない
- S4: 既存 CI ゲート(typecheck/lint/drift/tests/CCN/coverage)がすべて green のまま
