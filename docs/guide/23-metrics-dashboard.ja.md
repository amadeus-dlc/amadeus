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
  `dist_size` / `bugs`)ごとに1節、値キーごとに1本の折れ線チャート
- データ点にホバーすると `captured_at` と commit SHA(12桁)を表示。
  各チャート下の折りたたみ値表にも同じ列があり、ホバーなしでも遡れます
- 赤の強調は直前スナップショットからの劣化(CCN 違反の増加・カバレッジ
  低下・テスト失敗の非ゼロ・dist サイズ増・open なバグの増加)を示します

## `bugs` コレクタ

`bugs` はプロジェクトのバグ台帳である `bug` ラベル付き GitHub issue を、
Search API の `total_count` 10クエリで数えます: `total`(発生件数の累積)・
`open`・`closed`・`fixed`(completed でクローズ = 修正件数の累積)・
`rejected`(`is:closed -reason:completed` で数える、completed 以外の理由で
クローズした件数。wontfix/duplicate/not-planned)・重大度バケット
ごとの件数(`s1_fatal` / `s2_critical` / `s3_major` / `s4_minor`)・
`unlabeled`(重大度ラベルが1つも付いていない件数)。重大度バケットは
優先順位付き除外で相互排他です — 複数の重大度ラベルを持つ Issue は最上位の
バケットに1回だけ数えます(例: `s3_major` は
`label:S3-MAJOR -label:S1-FATAL -label:S2-CRITICAL` で照会)。これにより
重大度バケット + `unlabeled` が `total` を分割します。スナップショットに保存するのは累積値で、
ダッシュボードは累積系列をスナップショット間の増分としてチャート描画します
(見出しに `Δ` プレフィクス)。`open` は時点の残高なので生値のまま描画し、
値表も累積の生値を保持します。

唯一のネットワーク依存コレクタのため、2つのモードがあります。

- **`GH_TOKEN` も `GITHUB_TOKEN` も未設定** — コレクタはスキップします。
  スナップショットは `bugs` エントリなしで書き込まれ、CLI がその旨を報告します
  (例: `CHECK OK 6 collectors (skipped: bugs)`)。ローカル実行に資格情報は
  不要です
- **トークンあり** — `gh` 呼び出しが1つでも失敗したら、部分的なデータを
  記録せずスナップショット全体を失敗させます。リポジトリは
  `GITHUB_REPOSITORY`、なければ `origin` remote の URL から解決します

CI には常にトークンがあります: `metrics-snapshot` job の GitHub App に
`permission-issues: read` を付与しているため、公開されるスナップショットは
必ず `bugs` を含みます。

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
