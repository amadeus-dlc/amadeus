# Domain Entities — U1 tla-externalize

上流入力(consumes 全数): unit-of-work、unit-of-work-story-map、requirements、components、component-methods、services

## エンティティ(functional-domain-modeling-ts 様式)

- `TlaModelSource` — `{ readonly moduleBytes: Uint8Array; readonly cfgBytes: Uint8Array; readonly modulePath: string; readonly cfgPath: string }`。スマートコンストラクタ `TlaModelSource.load(modelPath, cfgPath): Result<TlaModelSource, ModelLoadError>` のみが生成経路(parse-don't-validate — 不在・空はここで拒否され、以降の型は有効性を運ぶ)
- `ModelLoadError` — 判別ユニオン `{ kind: "NOT_FOUND" | "EMPTY" | "IO"; path: string; detail: string }`
- `ModelIdentityBundle` — 既存(tla-arm.ts の identity tag 群)。本 Unit では形状不変で入力源のみ変更
- `ModelMapEntry` — `{ readonly implPath: string; readonly sha256: string }`。`ModelMap = { readonly entries: readonly ModelMapEntry[]; readonly modelPath: string; readonly updatedAt: string }`(first-class collection — 照合演算 `diff(current: ModelMapEntry[]): Drift[]` を持ち、U5 sensor がコンパニオンを共有消費)
- `Drift` — `{ readonly implPath: string; readonly recorded: string; readonly current: string | null }`(current null = 対象ファイル不在)。**diff() の戻り値型として本 Unit(U1)が canonical 定義を所有**し、U5 は import で消費する(U5 FD レビュー iteration 1 Major 2 の逆伝播是正 2026-07-22)

## 不変条件

- TlaModelSource は空 bytes を表現不能(コンストラクタで拒否)
- ModelMap.entries の implPath は重複なし・repo 相対 POSIX パスのみ
- ModelMap は specs/tla/model-map.json として単一ファイル所有(書込者は updateModelMap のみ)

## frontend-components.md について

本 Unit は UI を持たない(CLI/ファイル資産のみ)ため、optional の frontend-components.md は生成しない(CONDITIONAL 非該当 — 生成後の全候補列挙 assert で不在を確認する)。
