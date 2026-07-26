# メトリクスダッシュボード

> 言語: [English](23-metrics-dashboard.md) | **日本語**

このリポジトリは `main` へのマージごとにコード健全性のスナップショット
(`metrics/*.json`)を記録しています(`.github/workflows/ci.yml` の
`metrics-snapshot` job)。メトリクスダッシュボードはこの時系列を1枚の
自己完結 HTML に描画し、トレンド — カバレッジ低下・複雑度の増加・dist の
肥大 — を一目で確認できるようにします。

## 見方

ブラウザで `metrics/index.html` を開いてください。このファイルはコミット
されており、スナップショットのたびに CI が再生成するため、チェックアウト
した時点で常に最新です。サーバもネットワークも不要 — チャートは依存ゼロの
inline SVG です。

- コレクタ(`ccn` / `coverage` / `loc` / `tests` / `test_pyramid` /
  `dist_size`)ごとに1節、値キーごとに1本の折れ線チャート
- データ点にホバーすると `captured_at` と commit SHA(12桁)を表示。
  各チャート下の折りたたみ値表にも同じ列があり、ホバーなしでも遡れます
- 赤の強調は直前スナップショットからの劣化(CCN 違反の増加・カバレッジ
  低下・テスト失敗の非ゼロ・dist サイズ増)を示します

## コマンド

```bash
bun scripts/metrics-visualize.ts --write   # metrics/index.html を再生成
bun scripts/metrics-visualize.ts --check   # コミット済みページが再生成結果と一致するか検査
```

どちらも fail-closed です: 構造不正なスナップショット・空の `metrics/`・
サイズ上限超過の描画は、非ゼロ exit+書き込みなしで中断します。出力は
決定的(同一のスナップショット集合 → 同一バイト列)で、これが `--check`
のバイト比較を成立させています。

## 関連ツール

ダッシュボードはメトリクスサブシステムの描画側です。スナップショットの
記録は `scripts/metrics-snapshot.ts`、間引きは `scripts/metrics-retention.ts`
(最新360件保持)、テキスト表での閲覧は `bun scripts/metrics-timeseries.ts`。
4ツールは検証パーサを共有しており、有効なスナップショットの定義が
一致しています。
