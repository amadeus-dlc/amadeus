# Scope Document — metrics 可視化(B1 後続)

上流入力(consumes 全数): intent-statement.md, feasibility-assessment.md, constraint-register.md

## In Scope(やること)

intent-statement.md のユーザー裁定(Q1〜Q4)と feasibility-assessment.md の GO 判定・reuse inventory に基づく。

1. **HTML 生成スクリプト** — `metrics/*.json` 全件(retention 窓内)を読み、self-contained な `metrics/index.html` を生成する Bun スクリプト。パーサは `scripts/metrics-timeseries.ts` の parseSnapshot を共用(constraint-register.md C4)
2. **全6系列のトレンド表示** — ccn / coverage / loc / tests / test_pyramid / dist_size(Q3=A)。inline SVG、依存追加ゼロ(C1)
3. **成功基準3点の実装** — 1画面トレンド把握(主)、閾値超過の視覚強調、データ点→commit SHA トレーサビリティ(Q4=D)
4. **CI 同乗** — 既存 metrics-snapshot job(ci.yml:398-449)へ HTML 再生成ステップを追加し、snapshot と同一コミットで更新(Q2=C の CI 面)。loud-fail・ci-success 集約外の非対称を維持(C5)
5. **手動コマンド** — ローカルでいつでも再生成できる入口(Q2=C の手動面)
6. **テスト** — 生成スクリプトの unit/integration テスト、生成物ドリフトの検査方針は requirements で確定
7. **`metrics/index.html` のコミット** — 生成物としてリポジトリ管理(Q1=A)、手編集禁止の明示(C2)

## Out of Scope(やらないこと)

1. **GitHub Pages 公開** — Q1 裁定で A(コミットのみ)を選択。将来項目としてバックログへ
2. **Codecov の置換・複製** — カバレッジ時系列サービスは Codecov 既保有(C7、260712 build-vs-buy 既決)
3. **snapshot writer / retention の変更** — 可視化は読み取り専用の消費(C3)。スキーマ変更・コレクタ追加もしない
4. **アラート・通知** — 劣化検知の能動通知は既存ゲート(ratchet/codecov)の責務。本件は観測面のみ
5. **過去時点の遡及計測** — 260712 バックログ B5 のまま(本 intent は既存台帳の表示に限る)

## 成功基準(measurable)

- S1: `bun <手動コマンド>` 実行で `metrics/index.html` が生成され、ブラウザで6系列すべてのトレンドが1画面(スクロール可)で確認できる
- S2: CCN over_threshold 等の悪化方向の変化が視覚的に区別できる(色・強調の具体仕様は design で確定)
- S3: 任意のデータ点から commit SHA を特定できる(hover/表など、方式は design で確定)
- S4: CI の metrics-snapshot job が snapshot・retention・HTML 再生成を同一コミットで main へ push する
- S5: 検証劇場ゼロ — 生成物の検査は実行結果由来(落ちる実証を含む)
