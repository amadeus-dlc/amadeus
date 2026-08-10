# Component Methods — 成果物数値の provenance ガード

上流参照: `requirements.md` の受け入れ契約、`architecture.md` の同期sensor fire経路、`component-inventory.md` の `evaluate*` / `main` / `fail` と `requireFlagValue` の既存イディオム。

## 公開型

以下はApplication Design段階の境界契約であり、詳細なregexやverdict schemaの最終フィールドはFunctional Designで固定する。

```ts
type NumericClaimClass = "count" | "ratio" | "percentage" | "measured-value";
type EnforcementMode = "enforcement" | "measurement-only" | "skipped";

interface EvaluationInput {
  readonly stage: string;
  readonly outputPath: string;
  readonly content:
    | { readonly kind: "present"; readonly markdown: string }
    | { readonly kind: "missing" };
}

interface EvaluationDeps {
  readonly fileExists: (path: string) => boolean;
  readonly isRegularFile: (path: string) => boolean;
}

interface NumericProvenanceVerdict {
  readonly pass: boolean;
  readonly skipped: boolean;
  readonly findings: readonly NumericProvenanceFinding[];
  readonly metrics: Readonly<Record<string, number | string>>;
  readonly reason?: string;
}
```

## 評価・走査メソッド

### `evaluateNumericProvenance`

```ts
function evaluateNumericProvenance(
  input: EvaluationInput,
  deps: EvaluationDeps,
): NumericProvenanceVerdict;
```

missing、cutoff、対象外、lightweight report、mapping mode、claim抽出、provenance解決の順に合成する純粋な公開seam。`content.kind === "missing"` は最初に `pass: true, skipped: true, reason: "file-not-found"` へ写す。enforcementは未併記claimごとにfindingを返し、measurement-onlyはmetricsのみ、その他の対象外はskipped verdictを返す。判定可能な入力で例外を投げない。

### `scanNumericClaims`

```ts
function scanNumericClaims(markdown: string): readonly NumericClaim[];
```

固定4クラスと除外条件を使い、Markdown構造上の位置を保った候補を返す。コードフェンスや見出し番号などの非候補は返さない。実装時に外部公開が不要ならmodule-privateとし、Evaluator経由でテストする。

### `resolveProvenance`

```ts
function resolveProvenance(
  claim: NumericClaim,
  context: ProvenanceContext,
  deps: EvaluationDeps,
): ProvenanceMatch | undefined;
```

Generated Mappingの `W` とMarkdown構造境界の両方を満たす範囲だけを探索する。相対リンクはnormalize後の許可rootと実在通常ファイルを注入依存で検証し、絶対path、URL、root脱出、別intent、一般成果物を拒否する。

### `classifyArtifact`

```ts
function classifyArtifact(
  context: ArtifactContext,
  mapping: NumericProvenanceMapping,
): ArtifactClassification;
```

record日付、basename、record相対path、stage slugを入力にGenerated Mappingを検索する。Mappingはsweep時にruntime graphのdeclared producesから機械生成した `stage + record相対output pattern -> produces key` を保持するため、runtimeにgraph読込や追加flagは不要である。一致行のproduces keyとclaim classからmodeを決める。mapping不一致は判定不能としてskippedにし、本文の短さや`summary` / `report` substringで除外しない。

## sweep・CLIメソッド

### `sweepNumericProvenance`

```ts
function sweepNumericProvenance(
  corpusRoot: string,
  deps: SweepDeps,
): SweepReport;
```

Construction時に決定的sample identity、二値label、距離統計、偽陽性率、`W`、mode、配線stage集合を再計算する。入力読込とgraph取得は注入し、同一HEADで同じ順序と内容を返す。30 labels等の要件を満たさない組を自動的にmeasurement-onlyへ落とす。

### `main`

```ts
function main(argv?: readonly string[], deps?: CliDeps): void;
```

`requireFlagValue` で必須flagを読み、成果物を1回だけ読み取る。存在しない場合または読込時の `ENOENT` は `{ kind: "missing" }`、成功時は `{ kind: "present", markdown }` としてEvaluatorを必ず呼び、verdictをJSON出力する同期adapter。通常のFAILED verdictとfile-not-foundはexit codeへ写さない。CLIの引数不備など、成果物の業務状態ではない起動不能だけを `fail` へ渡す。

### `fail`

```ts
function fail(message: string): never;
```

dispatcherが起動エラーとして扱うCLI境界専用。claim不在、provenance不在、cutoff判定不能、対象外、ファイル不在の業務結果には使わない。

## エラー処理方針

| 条件 | 所有者 | 結果 |
| --- | --- | --- |
| 必須flag欠落 | CLI Adapter | `fail` による起動エラー |
| ファイル不在 / 読込時 `ENOENT` | CLI Adapterがmissingへ変換、Evaluatorが意味判定 | `pass: true`, `skipped: true`, `reason: "file-not-found"` |
| cutoff判定不能、対象外、mapping不一致 | Evaluator / Classifier | `pass: true`, `skipped: true` と理由 |
| enforcementでprovenance不在 | Evaluator | claimごとにfinding、`pass: false` |
| measurement-onlyでprovenance不在 | Evaluator | metricsへ計上、findingなし、`pass: true` |
| 不正な相対リンク | Provenance Resolver | provenance不成立として扱い、例外にしない |
