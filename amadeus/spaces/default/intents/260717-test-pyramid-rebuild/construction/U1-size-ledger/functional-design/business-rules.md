上流入力(consumes 全数): unit-of-work.md, unit-of-work-story-map.md, requirements.md, components.md, component-methods.md, services.md

# 業務ルール — U1 サイズ分類台帳(SizeLedger)

本書は台帳の各行が従う **業務ルール** を記す。**すべてのルールは既存純関数 `classifyTestSize` / `parseSizeAnnotation`(`tests/lib/test-size.ts`)由来の転記であり、台帳は独自判定ロジックを一切持たない**(ADR-04、components.md:17-19、Q1 e4 二重化禁止 unit-of-work.md:60)。本 intent は業務ルールの設計まで(実装 Out)。

実測 ref: measurement ref `3917a283a953165866170d235d3dc25ad2fd3643`(tests/ 全域再帰 442ファイル、E-TPR-NR1、measurement-ref-in-artifacts。RE diff-base は `d151561d8d9b7a01fa4f16d47da5434486a2e9e2`)。台帳のマトリクス数値は measurement ref のスイープ出力の転記であり、本書に再掲する数値もすべて RE 実測転記でハードコードではない(AC-1b、検証劇場 Forbidden)。

## 分類ルール(すべて classifyTestSize 由来の転記)

台帳は以下のルールを **自前で実装せず**、`classifyTestSize` の出力をそのまま `measured` / `signals` に載せる。ここに記すのはその関数の意味論の説明であって、台帳側の再実装契約ではない。

### R1: size = 検出 signal の最大(SIZE_ORDER 序数)

`classifyTestSize` は `SIGNAL_PATTERNS`(`test-size.ts:35-40`)を順に regex マッチし、検出した各 signal が要求する最小 size のうち **最大** を採る(`test-size.ts:58`、verbatim: `if (SIZE_ORDER[sigSize] > SIZE_ORDER[size]) size = sigSize;`)。序数は `SIZE_ORDER`(`test-size.ts:28`、verbatim: `export const SIZE_ORDER: Record<TestSize, number> = { small: 0, medium: 1, large: 2 };`)。signal 未検出なら `small`(初期値、`test-size.ts:54`)。

signal → 最小 size の対応(`test-size.ts:35-39` の転記):

| signal 名 | 強制する最小 size | 検出対象(要約) |
| --- | --- | --- |
| network | **large** | `node:net/http/https/http2/dgram/tls`、`WebSocket`、`fetch(`、`.listen(`(`test-size.ts:36`) |
| spawn | **medium** | `child_process`、`spawnSync`、`spawn(`、`execSync`、`Bun.spawn`、`node-pty` 等(`test-size.ts:37`) |
| filesystem | **medium** | `node:fs`、`readFileSync`、`writeFileSync`、`mkdtempSync`、`existsSync` 等(`test-size.ts:38`) |
| timer | **medium** | `setTimeout(`、`setInterval(`、`Bun.sleep`、`await sleep(`(`test-size.ts:39`) |

例: network 検出 → large。spawn または filesystem または timer のみ → medium。いずれも未検出 → small。1ファイルが複数 signal を検出しうる(配列で返る、`test-size.ts:53,57`)ため signal は重複計上され、size は最大値で確定する。

### R2: コメント除去後に判定

signal 検出は **ソースからコメントを除去した後** のコードに対して行う(`test-size.ts:52`、verbatim: `const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");`)。散文(例: 「以前は spawnSync を呼んでいた」というコメント)が size を誤って押し上げないため。台帳の `measured` はこの除去後判定の転記。

### R3: tier 導出 = ディレクトリ第1階層

`tier` は台帳固有ルールではなく既存前提の踏襲: repo 相対パスの第1階層(`scripts/metrics-snapshot.ts:100`、verbatim: `const tier = relative(join(env.repoRoot, "tests"), file).split(/[\\/]/)[0];`)。値域は **開いた集合**(tests/ 直下サブディレクトリ名 — 既知4 named tier `unit | integration | e2e | smoke` + `harness` / `lib` 等の補助 tier。全域再帰列挙で harness/lib 各1件を実測)。tier×size 規約(U2)の対象は 4 named tier のみで、補助 tier は台帳に可視化するが規約対象外(E-TPR-NR1)。新アノテーション契約を足さない(E-TPR-AD Q3=A、components.md:100)。**size(動的振る舞い)と tier(配置)は独立軸**(`test-size.ts:5-7` の設計コメント: t_wada gihyo / Google SWE ch.14)。

### R4: declared 抽出 = parseSizeAnnotation

`declared` は既存 `parseSizeAnnotation(source)`(`test-size.ts:279`)の転記。先頭コメント領域(先頭約40行、`test-size.ts:280`)を走査し `// size: <value>` または `# size: <value>` の最初のマッチを採る(`test-size.ts:282`)。値が有効な `TestSize`(small/medium/large、`test-size.ts:285`)なら `declared` にそれを、無効値なら `declared: null` + `invalidValue`(`test-size.ts:288`)、アノテーション無しなら `declared: null`(`test-size.ts:290`)。台帳側で `// size:` パースを再実装しない。

### R5: ${tier}_${size} キー整合

マトリクスの集計キーは `${tier}_${size}`(既存 `test_pyramid` コレクタ `scripts/metrics-snapshot.ts:102` と exact 一致、verbatim: `values[`${tier}_${size}`] = (values[`${tier}_${size}`] ?? 0) + 1;`)。台帳は既存コレクタと同一キー形式を踏襲し、消費側(コレクタ)が本台帳を共通利用できる形にする(components.md:31、Q1=B 配置=独立モジュール)。

## 分類経路の一本化(二重化禁止 — Q1 e4)

**判定ロジックは `classifyTestSize` に閉じ、台帳側で再実装しない**(unit-of-work.md:60、components.md:35)。本台帳モジュールは `buildLedgerRow` / `buildSizeLedger` の最小構成に留め、**既存 `test_pyramid` コレクタは自前の size 分類を持たず本モジュール(= `classifyTestSize` 唯一真実源)を消費する一方向依存** とする。size 判定経路を二重化しない(E-TPR-AD Q1=B、components.md:35、業務ルールの単一定義点)。

- 台帳は `classifyTestSize` の出力を **転記** するのみで、SIGNAL_PATTERNS の再定義・序数比較の再実装・declared パースの再実装をいずれも持たない。
- ルールが変わるとき(将来 SIGNAL_PATTERNS 変更等)は `test-size.ts` 側の1箇所が変わり、台帳は自動追随する(規模増の機械追随、requirements.md:47)。

## tier×size マトリクス(RE 実測転記、tests/ 全域再帰、measurement ref `3917a283a953165866170d235d3dc25ad2fd3643`)

以下は `classifyTestSize` スイープ出力の転記(AC-1a、ハードコードではなく実行出力転記):

| tier | small | medium | large | 計 |
| --- | --- | --- | --- | --- |
| unit | 48 | 162 | 1 | 211 |
| integration | 9 | 138 | 0 | 147 |
| e2e | 3 | 63 | 2 | 68 |
| smoke | 0 | 14 | 0 | 14 |
| harness | 0 | 1 | 0 | 1 |
| lib | 0 | 1 | 0 | 1 |
| **計** | **60** | **379** | **3** | **442** |

tier は開いた集合で **harness/lib は補助 tier=tier×size 規約の対象外**(台帳に可視化のみ、E-TPR-NR1)。size 宣言(`// size:`)あり 53件 / なし 389件(442 − 53、harness/lib は無宣言 — grep 実測)、`declared < measured` ドリフト 0件(scan-notes、既存 declared-vs-measured ゲートは現状グリーン)。

## 実装スコープ境界(Out 明記)

- 本書は分類・集計の **業務ルールの設計(既存関数意味論の明文化)** まで。tier-aware ドリフトゲート(C3)の判定・比率目標・実行時間予算は U2 の担当であり本ユニット Out。
- 実移設・retier・生成スクリプト実装・CI 配線は本 intent Out(unit-of-work.md:66-69)。
- 後方互換シム・二重実装を足さない(Forbidden P5)。既存 `classifyTestSize` / `parseSizeAnnotation` / `SIZE_ORDER` は不変(非破壊再利用)。
