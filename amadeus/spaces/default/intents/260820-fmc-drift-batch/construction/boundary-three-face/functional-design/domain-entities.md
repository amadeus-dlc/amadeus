# Domain Entities — boundary-three-face(U2 / #2929)

上流入力: `business-logic-model.md` / `business-rules.md` / `component-methods.md`(C3)/ `unit-of-work.md` U2 / `unit-of-work-story-map.md`(#2929 クローズ条件)/ `requirements.md` FR-BND 群 / `components.md` C3 / `services.md`(消費群)。本 unit は新規ドメイン概念を導入しない — 既存エンティティの形状変更・拡張の台帳として書く。

## 変更されるエンティティ

| エンティティ | 所在 | 変更 |
|---|---|---|
| `IMPLEMENTATION_PATHS` | `amadeus-formal-verif-model-map.ts:248-251` | 形状変更: `readonly [string, RegExp][]` → フルパス `readonly RegExp[]`(core 等価変換 + plugin 一般形の2要素)。**export 化**(現行は module-private) |
| `isCanonicalImplementationPath` | 同 `:330-336` | 照合部を RegExp リスト適用へ置換。**export 化**。前段検査(型・`\\`・絶対・正規形・`..`)不変 |
| loader `verifyImplementationEntries` | `tla-model-loader-internal.ts:286-315` | `implementationRoot` ローカル定数を撤去し、repo 相対 POSIX パスへの共有述語適用に置換。symlink/regular/sha256 検査は不変 |
| sensor manifest `matches` | `sensors/amadeus-model-completeness.md:8` | entries 全被覆 glob へ更新(単一 brace グループ形を維持) |
| model-map.json `models[].entries` | `amadeus/spaces/default/specs/tla/model-map.json` | PrConvergenceGate / BoltPrAttestationGate 各 +4 entry(pr-convergence plugin 4ファイル、implPath 昇順挿入、実 sha256) |

## 新設されるエンティティ(テストのみ)

| エンティティ | 所在 | 役割 |
|---|---|---|
| glob drift テスト | 新規(integration) | manifest `matches` × model-map entries の被覆検査(本番 `matchesGlob` をオラクルに使用)。glob 更新より先に作成し現行断面の赤を実測(business-logic-model.md 手順3) |
| loader 境界テスト | `tests/integration/t-formal-verif-tla-model-loader.integration.test.ts` へ追加 | plugin entry の受理・境界外拒否・sha256 drift 拒否(SOURCE_DRIFT 実測) |

## 不変のエンティティ(境界確認)

- `ModelMapEntry` スキーマ(`implPath` + `sha256` のみ、exactObject)— フィールド追加なし
- model/cfg identity・vocabulary・auxiliaries 等の model-map 他キー — 非接触
- `run-model-check-artifacts.ts` の `isContained` / loader `:141` の汎用 `isContained`(spec-dir 用途)— 非接触
- 既存13 entries(全て `packages/framework/core/tools/`)とその sha256 pin — 非接触(U2 は engine ファイルを変更しない)

## ライフサイクル

3面是正 + entries 追加は1 PR で原子的に行う(FR-RET と同型の同一変更要求 — validator/loader が plugin entry を受理できない中間状態を main に置かない)。以後の pr-convergence plugin 4ファイルの変更は governed となり、hash pin resync(`updateModelMap --impl-only`)が変更側 PR の義務になる — これは #2929/#3186 が意図する監視の成立であり、cid:build-and-test:bt-ledger-resync の台帳クラスに plugin 面が加わる。
