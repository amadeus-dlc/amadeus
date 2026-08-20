# Business Rules — boundary-three-face(U2 / #2929)

上流入力: `business-logic-model.md`(是正手順)/ `requirements.md` FR-BND-1〜6・NFR-1/2 / `unit-of-work.md` U2 / `unit-of-work-story-map.md`(#2929 クローズ条件)/ `components.md` C3 / `component-methods.md` C3 / `services.md`(model-map 消費群 — スキーマ不変・境界集合のみ拡大)。

## 不変条件(是正後に成立していなければならない規則)

- **BR-1(単一正本)**: モデル実装境界を判定する述語は `isCanonicalImplementationPath` の1定義のみ。validator(parse 時)と loader(verifyImplementationEntries)は同一 export を消費し、境界データ `IMPLEMENTATION_PATHS` の定義は `amadeus-formal-verif-model-map.ts` の1箇所のみ。loader 側に prefix・root のハードコードを残さない(FR-BND-2)。
- **BR-2(既存エラー契約不変)**: validator の `MODEL_MAP_INVALID`(`entries[i].implPath is outside the canonical implementation boundary`)と loader の SOURCE_DRIFT 各 reason 文字列(`implementation entry is not a regular in-boundary file` / `hash differs` 系)は変更しない — 境界**集合**だけが広がる(components.md C3 公開面の宣言どおり)。
- **BR-3(fail-closed、NFR-2)**: 境界判定不能・escape(`..`・絶対パス・symlink・POSIX 正規化不一致)は全て拒否側に倒す。glob drift テストは「非被覆 entry の存在」を赤にする方向で書く(被覆の証明であって非被覆の黙認ではない)。
- **BR-4(entries 整列不変条件)**: model-map.json の entries は implPath 昇順・unique を維持(validator が enforce)。この不変条件は **per-model スコープ**(`parseEntries` は各モデルの entries 配列単位で検査)であり、同一 implPath が複数モデルの entries に現れることは正当(PrConvergenceGate / BoltPrAttestationGate が同じ engine 2ファイルを既に共有している現行形と同じ)。8 entry 追加後もこの不変条件で parse green。
- **BR-5(非接触面)**: `run-model-check-artifacts.ts:129` の `isContained`(アーティファクト出力用)、loader `:141` の汎用 `isContained`(spec-dir 検査用途)、`updateModelMap` の既存経路、セルフインストール投影(境界対象外のまま — FR-BND-1)は変更しない。
- **BR-6(オラクル非相殺)**: glob drift テストのオラクルは本番 `matchesGlob` の import であり、glob 意味論の再実装を持たない。テストの検出対象は「manifest glob と model-map entries の被覆 drift」に限定し、matcher 自体の正しさは既存 matcher テストの守備範囲とする。
- **BR-7(TDD の適用形)**: 3面それぞれで赤を先に実測する — validator 受理側テスト(形状変更前に赤)、loader 境界テスト(現行 `in-boundary` 拒否の baseline 赤)、glob drift テスト(現行 glob の orchestrate/state 非被覆で自然に赤)。いずれも注入不要の自然な赤であり、革面ごとの Red → Green を code-summary へ転記する。
- **BR-8(glob 形式制約)**: sensor manifest の `matches` は自製 matcher の制約(brace 展開1グループのみ)内に収める。将来 entries が増えて glob 更新が要るときは drift テストが赤で知らせる — glob を手書き維持する設計(ADR-2)の安全弁。

## エラー処理

- 新設されるエラー経路はない — 既存の MODEL_MAP_INVALID / SOURCE_DRIFT 契約に合流する(BR-2)。
- glob drift テストの赤は「entries と glob の非整合」— 是正は glob 側の更新が既定(entries は model-map が正)。entries 側の誤登録(境界外パス)は validator が先に止める。
- entries 追加時の sha256 誤記は completeness check / loader が `hash differs` で停止(fail-closed)— 素通りする経路は存在しない。
