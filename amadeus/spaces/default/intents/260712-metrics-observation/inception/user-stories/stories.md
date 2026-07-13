# ユーザーストーリー — metrics-observation

> user-stories:c1 に従いジャーニー別エピックで分割(導入 / 観測 / 保守)。各ストーリーは独立テスト可能、受け入れ基準は Given/When/Then。

## Epic A: 導入(snapshot が蓄積され始める)

### A-1: マージで自動記録される(P1/P2)
- As P1, main へのマージのたびに snapshot が自動蓄積されてほしい — 手作業ゼロで観測が始まる価値。
- **AC**: Given main への push, When snapshot workflow が完走, Then `metrics/<ISO8601>.json` が新規コミットされ(FR-2/FR-3)、そのコミットが CI を再誘発しない。

### A-2: 計測失敗が隠れない(P3)
- As P3, collector が壊れたら黙って古い値が残るのではなく loud に知りたい。
- **AC**: Given collector 失敗の注入, When `--write` 実行, Then exit 1・ファイル非生成・失敗 collector 名表示(FR-4 — 落ちる実証)。

## Epic B: 観測(蓄積を読む)

### B-1: 時系列で傾向を読む(P1)
- As P1, 任意区間の CCN 分布・カバレッジ%・テスト層比率の推移を集計したい。
- **AC**: Given 複数 snapshot, When jq 等で `collectors.<name>` を横断抽出, Then スキーマが全 snapshot で一貫(schema_version)し、機械集計が成立(FR-5)。

### B-2: 変化点の因果を特定する(P2)
- As P2, 指標が動いた snapshot からどの変更が原因かを辿りたい。
- **AC**: Given 値が変化した snapshot, When `commit` フィールドを参照, Then 対応する main コミット(=1 Bolt)へ一意に到達できる。

### B-3: 計測器の不連続点を誤読しない(P1/P3)
- As P1, 値のジャンプが「コードの劣化」か「計測器の更新」かを区別したい。
- **AC**: Given 計測器バージョンが変わった snapshot, When `tool_version` を比較, Then 不連続点が機械判別できる(FR-5 / RAID R3)。

## Epic C: 保守(機構を育てる)

### C-1: collector を独立に追加する(P3)
- As P3, 新メトリクスを既存 collector に触れず追加したい。
- **AC**: Given 新 collector の追加, When スキーマ検証テスト実行, Then 既存 collectors キーに diff なし(FR-5 受け入れ基準)。

### C-2: 手動でいつでも計測できる(P2/P3)
- As P2, ローカルで即時に snapshot を取りたい(CI を待たない)。
- **AC**: Given ローカル環境, When `bun <tool> --write`, Then workflow と同一契約で snapshot 生成(FR-3)。
