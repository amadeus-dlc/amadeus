# Domain Entities — U1 installer-enum-extension(Issue #1048)

上流入力(consumes 全数): `../../../inception/units-generation/unit-of-work.md`、`../../../inception/units-generation/unit-of-work-story-map.md`、`../../../inception/requirements-analysis/requirements.md`、`../../../inception/application-design/components.md`(C1〜C7)、`../../../inception/application-design/component-methods.md`、`../../../inception/application-design/services.md`。

## エンティティ(既存 — 値集合のみ変更)

### HarnessName(brand 型 — harness.ts:9)

- 表現: `("claude" | "codex" | "kiro" | "kiro-ide" | "opencode" | "cursor") & { readonly [harnessBrand]: "HarnessName" }` — union へ 2 literal 追加
- コンパニオン `HarnessName.all`(:19-24 frozen 配列): 同じ 6 値。functional-domain-modeling-ts 既決様式(brand 型+スマートコンストラクタ)を保存
- `HarnessName.parse(raw): Result<HarnessName, InvalidHarnessName>`(:29): シグネチャ・意味論とも不変

### InvalidHarnessName(:16)

変更なし — `{ readonly raw: string }`。エラー表示は reporter 側(6値列挙文言のみ更新)。

### ENGINE_DIR_BY_HARNESS(engine-layout.ts:8-13)

`Readonly<Record<string, string>>` の frozen map(実測 verbatim: `const ENGINE_DIR_BY_HARNESS: Readonly<Record<string, string>> = Object.freeze({...})`)— キー型は string であり、entry 漏れは**型検査では検出されない**。全数性の担保は (i) `engineDirNameFor` の未知キー runtime fail-fast(:15-20 `throw new Error(...)`)と (ii) 契約テストの literal 固定(BR-1)の2機構による。実装時は entry 追加漏れが tsc を通過することに注意(AC-1b の検証は fixture テストで実測)。

## 関係とライフサイクル

エンティティ間関係(HarnessName → engine dir → dist ツリー名)は 1:1:1 のまま。ライフサイクル状態なし(不変値オブジェクト)。新規エンティティ・新規関係の導入なし(FR-1 AC-1e)。

## エンティティ相互作用

`parse` の成功値だけが engine-layout / wizard / verifier へ流れる(parse-don't-validate — 無効状態は表現不能)。相互作用パターンの変更なし。
