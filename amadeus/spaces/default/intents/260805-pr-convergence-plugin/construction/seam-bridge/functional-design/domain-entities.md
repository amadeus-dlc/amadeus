# Domain Entities: seam-bridge(U1)

上流入力(consumes 全数): unit-of-work、unit-of-work-story-map、requirements、components、component-methods、services

U1 の責務境界は unit-of-work の U1 定義(core のみ・plugin バンドル非接触)、担当 FR は unit-of-work-story-map の U1 列(FR-1a/1b・FR-2a〜2d・NFR-1 install 面・C-2)に従う。所在: `packages/framework/core/tools/amadeus-plugin-compose.ts`(parse/serialize)+`amadeus-plugin.ts`(host snapshot 結線)。

## AD からの申告付き精密化(逸脱申告)

component-methods C1 の契約は `parseStageFrontmatterSeams(bytes): Result<HostStageSeams, ...>` / `serializeStageFrontmatterSeams(original: Buffer, seams): Result<Buffer, ...>` と capability レベルで記載されていたが、本 FD は次の2点を**申告付きで精密化**する: (1) parse の戻り値を `StageFrontmatterDocument`(raw バイト+seamSpans 保持)へ拡張 — バイト保存不変条件(ADR-1 Consequences「往復 byte-identity」)の実現には parse 結果が原本バイトと span 情報を運ぶ必要があり、`HostStageSeams` 単体では serialize 時に原本を失う (2) serialize の第1引数を `doc: StageFrontmatterDocument` へ変更(同根 — original: Buffer の再 parse を不要にし、parse-don't-validate を型で運ぶ)。関数名は `parseStageFrontmatter` / `serializeStageFrontmatterSeams` とする。責務・所在(C1、amadeus-plugin-compose.ts)・不変条件は AD と同一であり、シグネチャの精密化のみ — ADR-1 の Decision(frontmatter 保存型 parse/serialize)の実現形として整合。

## エンティティ(型)一覧

### StageFrontmatterDocument(新設 — parse 結果の全体保存形)

```ts
type StageFrontmatterDocument = {
  readonly slug: string;                       // frontmatter の slug: フィールド
  readonly seams: StageSeams;                  // 既存型(SEAM_NAMES 4配列 — produces/consumes/sensors/required_sections)
  readonly raw: Buffer;                        // 原本バイト列(バイト保存の基準)
  readonly seamSpans: Readonly<Record<SeamName, SeamSpan | null>>;  // 各 seam 配列の原本内バイト範囲(不在は null)
};
type SeamSpan = { readonly start: number; readonly end: number; readonly style: SeamListStyle };
type SeamListStyle = "block-list" | "flow-empty";   // 実ステージの2様式: YAML block list(- item 行)と空 flow([])
```

- `parseStageFrontmatter(bytes: Buffer): Result<StageFrontmatterDocument, SeamParseError>` がスマートコンストラクタ(parse-don't-validate)。`---` 区切り frontmatter の実在・`slug:` 実在・seam 4種の span 特定を検証し、不整合は typed error(fail-closed — 既存 `parseHostStageSeams` の null 返しと異なり、実ステージで parse に失敗した場合は loud)
- **consumes の構造注意(実測)**: 実ステージの `consumes:` は `- artifact: <name>` のオブジェクトリスト。seam としての consumes 配列は `artifact` 値の列として読み、**serialize では consumes seam を書換え対象にしない**(本 intent の overlay は produces のみ — 書換え面を最小化)

### SeamParseError / SeamSerializeError(判別 union)

```ts
type SeamParseError =
  | { readonly kind: "no-frontmatter" }
  | { readonly kind: "no-slug" }
  | { readonly kind: "seam-span-ambiguous"; readonly seam: SeamName };
type SeamSerializeError =
  | { readonly kind: "roundtrip-mismatch" }        // serialize 検証(後述の不変条件3)の失敗
  | { readonly kind: "unsupported-target-seam"; readonly seam: SeamName };
```

### 既存型の再利用(変更しない)

- `StageSeams` / `SeamName` / `SEAM_NAMES`(amadeus-plugin-compose.ts:74-144)— seam 語彙の正本
- `HostStage`(:146)— host snapshot の要素型。U1 は `buildHostSnapshot` の stage 認識経路に `parseStageFrontmatter` 由来の HostStage を**追加**する(既存 `parseHostStageSeams` の合成バイト形受理は不変 — t301 固定)
- `SeamLedgerEntry` / seam 台帳・merge・drop 復元(既存)— U1 は台帳の書式を変えない

## 不変条件

1. **バイト保存往復**: seam 無変更の `serializeStageFrontmatterSeams(doc, doc.seams)` は `doc.raw` と byte-identical(ADR-1 Consequences のテスト固定)
2. **対象外不変**: produces seam のみを変更した serialize は、seamSpans.produces の範囲外のバイトを一切変更しない(本文・コメント・他フィールド・空白・改行様式の保存)
3. **serialize 後再 parse 検証**: serialize 出力を再 parse し、意図した seam 値と一致しない場合は書き込まず `roundtrip-mismatch` で fail(壊れた frontmatter をディスクへ出さない)
4. **受理集合の最小性**: serialize の書換え対象は `produces` seam のみ(`unsupported-target-seam` で他 seam を拒否)。将来の拡張は明示の設計変更として行う
