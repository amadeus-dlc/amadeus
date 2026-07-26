# Component Methods — metrics 可視化(B1 後続)

上流入力(consumes 全数): requirements.md, architecture.md, component-inventory.md, team-practices.md

## 方針

functional-domain-modeling-ts 採用(project.md DECIDED)だが、本件は既存 metrics 3スクリプトの「裸の純関数+判別 union 戻り値」様式(architecture.md 実測)が確立済みのため、近傍スタイル優先で同様式を踏襲する(ブランド型・コンパニオンの新規セレモニーは持ち込まない — 意図: 4ファイル群の一貫性)。

## R-1: metrics-timeseries.ts への export 追加(ADR-2)

```ts
// 既存 :117-119 を export へ昇格(実装不変)
export function formatValue(v: unknown): string;
// 新設: チャート座標用の数値抽出。有限 number のみ値を返す
export function numericValue(v: unknown): number | null;
```

- `numericValue` は `typeof v === "number" && Number.isFinite(v)` のときのみ v、それ以外 null(NaN/Infinity/非 number を欠測へ落とす単一点 — FR-3 の非有限値排除の実装座)
- 消費者棚卸し(dual-key: 変数名 `formatValue` / リテラルなし): 現状の消費者は timeseries 内部の renderDigest/renderCollectorTable のみ(grep 実測は construction で再実行 — inventory-from-grep-each-time)

## V-1: CLI(metrics-visualize.ts)

```ts
export function parseArgs(argv: string[]): ArgsOutcome; // --write | --check のみ。他は usage exit 2
export function main(argv: string[]): number;           // fs 境界。exit code を返す(process.exit は呼び出し元 1箇所)
```

- `main` の流れ: readdir(join(root,"metrics")) → `.json` filter+sort → assertNonEmpty → 全件 parseSnapshot(1件でも error なら stderr+return 1 — zero-write)→ buildSeries → renderHtml → サイズガード → `--write`: writeFileSync / `--check`: 既存読込とバイト比較
- ルート: `AMADEUS_METRICS_ROOT ?? ROOT`(snapshot :112 と同一規約)

## V-3〜V-7: 純関数群(すべて export、unit テスト対象)

データ集約(旧 V-2)は独立コンポーネントとせず V-1 `main` 内の直列フロー(上記)に統合する — 専用の中間構造・専用シグネチャは持たない(レビュー Major-2 の是正)。

```ts
export function renderHtml(series: Snapshot[]): string;                    // V-3 全体組み立て
export function renderCollectorSection(series: Snapshot[], collector: string): string; // コレクタ1節(チャート+表)
export function svgLinePath(points: Array<number | null>, w: number, h: number): string; // V-4 null はセグメント分断
export function regressionClass(collector: string, key: string, prev: unknown, curr: unknown): string; // V-5 悪化なら "regressed"、それ以外 ""
export function escapeHtml(s: string): string;                             // V-6
export const MAX_HTML_BYTES: number;                                       // V-7(ADR-3 の導出式)
```

- `regressionClass` の判定表(FR-4 S2 の列挙をコード化。データ駆動部分と独立した固定契約):
  - `ccn.over_threshold` / `ccn.max` / `dist_size.bytes`: curr > prev で regressed
  - `coverage.percent`: curr < prev で regressed
  - `tests.failedFiles` / `tests.failedAssertions`: curr ≠ 0 で regressed(prev 不問)
  - 上記以外のコレクタ・キー: 常に ""(未知コレクタは強調なしで表示のみ — R2 契約と両立)
- 比較は `numericValue` を通した後にのみ行う(どちらかが null なら "")
- SVG: 各キーごとに 1 折れ線。y スケールはキー単位の min/max から線形。点には `<title>` で captured_at + commit 12桁(S3)

## T-1 / T-2: テスト対象マップ

| テスト | 対象 | 種別 |
|---|---|---|
| unit | parseArgs / svgLinePath(null 分断・単点・全 null)/ regressionClass(両側: 悪化・非悪化・非数値)/ escapeHtml(5文字)/ MAX_HTML_BYTES 導出式 / renderHtml(全コレクタ出現・SHA title・self-contained = `http` 非出現 grep) | 純関数 |
| unit | serializeSnapshot 16_384 ピン(ADR-3 — 大きな snapshot で throw を実駆動) | ミラー定数の固定 |
| unit | AC-7 契約 grep: `scripts/metrics-timeseries.ts` のソースに fs write API(writeFileSync / appendFileSync / createWriteStream / node:fs の write 系 import)が不在であることを機械検査(AC-1c「grep-checkable」の実行体、requirements.md AC-7) | 契約ガード |
| integration | main: --write 生成 / --check 一致・不一致(drift 落ちる実証)/ 壊れた JSON → exit 1 zero-write / 空 dir → exit 1 / dir 不在 → exit 1 / dangling symlink → exit 1 / usage exit 2 | fs+CLI(AMADEUS_METRICS_ROOT seam) |
| integration | 実データ sweep(repo の metrics/ 123件を read-only で --write を temp 出力先へ)→ 生成成功+6コレクタ出現 | AC-1 |
