# Domain Entities — U1 tla-externalize

上流入力(consumes 全数): unit-of-work、unit-of-work-story-map、requirements、components、component-methods、services

## エンティティ(functional-domain-modeling-ts 様式)

- `VerifiedTlaSource` — `{ readonly moduleBytes: Uint8Array; readonly cfgBytes: Uint8Array; readonly moduleSource: string; readonly cfgSource: string; readonly moduleIdentity: string; readonly cfgIdentity: string; readonly modelMap: ModelMap }`。production の生成経路は引数なしの `loadVerifiedTlaSource(): Result<VerifiedTlaSource, TlaModelPipelineError>` のみとし、不在・空・identity/hash drift はここで拒否する(parse-don't-validate)
- `ModelLoadError` — `{ readonly kind: "MODEL_LOAD"; readonly code: ModelLoadErrorCode; readonly relativePath: string; readonly detail: string; readonly cause?: unknown }`。model/cfg/map の不在・空・非regular・symlink・読取不能を固定codeで区別する
- `ModelIdentityBundle` — 既存(tla-arm.ts の identity tag 群)。本 Unit では形状不変で入力源のみ変更
- `ModelMapAssetIdentity` — `{ readonly path: string; readonly identity: string }`。model/cfg の固定 repository 相対 path と canonical identity を結合する
- `ModelMapEntry` — `{ readonly implPath: string; readonly sha256: string }`
- `ModelMap` — `{ readonly schemaVersion: 1; readonly model: ModelMapAssetIdentity; readonly cfg: ModelMapAssetIdentity; readonly entries: readonly ModelMapEntry[] }`。時刻フィールドを持たない決定的な first-class collection とし、照合演算 `diffModelMap(modelMap, currentEntries): readonly ModelMapDrift[]` を持つ
- `ModelMapDrift` — `{ readonly implPath: string; readonly recorded: string; readonly current: string | null }`(current null = 対象ファイル不在)。**diffModelMap() の戻り値型として本 Unit(U1)が canonical 定義を所有**し、U5 は import で消費する(U5 FD レビュー iteration 1 Major 2 の逆伝播是正 2026-07-22)

## 不変条件

- TlaModelSource は空 bytes を表現不能(コンストラクタで拒否)
- ModelMap.entries の implPath は重複なし・repo 相対 POSIX パスのみ
- ModelMap は specs/tla/model-map.json として単一ファイル所有(書込者は updateModelMap のみ)
- U5 sensor は独自 schema/type を再定義せず、U1 所有の `tla-model-map.ts` から `ModelMap`、`ModelMapEntry`、`ModelMapDrift`、`parseTlaModelMap`、`diffModelMap` を import して共有する

## frontend-components.md について

本 Unit は UI を持たない(CLI/ファイル資産のみ)ため、optional の frontend-components.md は生成しない(CONDITIONAL 非該当 — 生成後の全候補列挙 assert で不在を確認する)。
