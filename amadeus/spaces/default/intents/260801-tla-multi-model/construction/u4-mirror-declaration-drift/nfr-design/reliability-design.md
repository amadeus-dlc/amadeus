# Reliability Design — u4-mirror-declaration-drift

**Intent**: 260801-tla-multi-model / **Stage**: nfr-design / **Unit**: u4-mirror-declaration-drift(C7+C8-MirrorLifecycle 面)

上流入力(consumes 全数): reliability-requirements(REL-U4-1〜6 / 非適用補足), performance-requirements(PERF-U4-1: timeout 予算との両立), security-requirements(SEC-U4-2 fail-closed / SEC-U4-3 publish 単一性 — 同一機構), scalability-requirements(非適用), tech-stack-decisions(D-U4-1), business-logic-model(§2.2 fail-closed / §3.2 冪等補正 / §3.3 latch / §5 不変性 / §7.5 patch カバレッジ), business-rules(BR-SC3 / BR-SU2〜6 / BR-IO1〜4 / BR-P1〜P7)

## 設計方針

可用性 SLO を持つサービスではないため、信頼性設計は **fail-closed・冪等性・決定性・後方互換** の4柱に集約し、いずれも functional-design(business-logic-model)既定の機構にそのまま写像する。retry・回路遮断・health check・failover は適用外 — reliability-requirements.md 非適用補足の段落どおり、変更対象は永続状態を持たない検証ツールと repo 内 JSON 宣言であり稼働率・データ耐久性の概念が成立しない。障害時の挙動は REL-U4-1/4 の fail-closed・atomic publish で全てカバーされる。

## NFR → 機構 → 検証の写像

| NFR | 設計機構(functional-design 由来、新規発明なし) | 検証方法(どのテスト/AC が証明するか) |
|---|---|---|
| REL-U4-1(fail-closed) | リゾルバ失敗(未解決・循環・境界外)は check では `declaration-unresolved` finding(verdict `reason: "drift"` で赤)、updateModelMap では `UPDATE_FAILED` 系失敗。「宣言なしとみなす」等の黙示 fallback は設計に存在しない(business-logic-model §2.2)。security-design.md の fail-closed 型付きエラー分類(SEC-U4-2)と同一機構 | t405 resolver 失敗ケース(循環参照 fixture → `declaration-unresolved` 赤)が green(u4 AC2 / BR-SC3 / BR-SU6 / BR-P5) |
| REL-U4-2(冪等性) | flagless updateModelMap の宣言補正は補正後 map に対する再実行で「identity 変化なし・宣言一致」となり `MODEL_UNCHANGED` を返す(business-logic-model §3.2 の冪等性節) | t405 補正ケースの「2回目は MODEL_UNCHANGED」assert が green(BR-SU3) |
| REL-U4-3(決定性) | auxiliaries 配列は path 昇順、identity は canonical JSON + sha256 の決定的アルゴリズム、キー列挙順は canonicalRecord の規則どおり(現行順維持・追加分を所定位置へ挿入)。同一入力(map + TLA ソース)に常に同一 verdict・同一 byte 出力(business-logic-model §3.1 / §4.1、ADR-1) | t405 三者一致ケース(u4 AC3: updateModelMap 書込値 = loader 実測値 = `canonicalIdentity` 直接計算値)が計算値の一意性を機械検証。BR-SU2(補正後 map が u1 スキーマで parse 可能で再 check 緑) |
| REL-U4-4(publish の原子性) | 宣言補正を含む全 publish は lock + validatePublishTarget + publishAtomic のみを通り半更新を公開しない(business-logic-model §5)。--impl-only は aux 変化・宣言不一致の存在下で `INVALID_ARGUMENT` 拒否し entries-only の純粋性を latch で保証(§3.3)。security-design.md SEC-U4-3 と同一機構 | t380 拡張3ケース(aux 変化拒否・宣言不一致拒否・非 entries フィールド deep-equal)が green(BR-SU5 / BR-IO1〜3 / BR-P6) |
| REL-U4-5(後方互換、NFR-1) | verdict 型・`UpdateModelMapResult` 型・CLI 引数面・`diffModelMap` / safeReadFile / lock / atomic publish の semantics は不変。追加は FindingReason の2メンバのみ。FormalElection の検証結果・map 宣言は不変(canonicalRecord は auxiliaries を持たないモデルにキーを出さない非侵襲、business-logic-model §3.1 / §5) | t380・sensor 系既存4テストが期待値不変で green(BR-I1 / BR-I2)。mirror-model-registration pin の既存5ケース不変 |
| REL-U4-6(patch カバレッジ 100%) | 変更行 0-hit 不許容。sensor 本体の新規分岐(aux 計測・宣言照合・補正・latch 拒否)は t405・t380 拡張が全て打ち、テストは修正と同 PR で運ぶ(business-logic-model §7.5) | BR-P7: patch gate 充足、`bun run typecheck` / `bun run lint` / 既存テスト green |

## グレースフルデグラデーションを採用しない理由

NFR-2 の fail-closed 方針と矛盾するため。退化動作(黙示 fallback・部分成功・「宣言なしとみなす」)は REL-U4-1 で明示的に禁止しており、「部分的に動く」設計は偽緑(宣言 drift を見逃す sensor)を生む。判定不能は常に赤、の単一原則に全経路(check / updateModelMap / --impl-only)を揃える。

## 下流(code-generation)が侵してはいけないこと

- リゾルバ失敗・宣言不一致を成功・スキップ・空集合として扱うコードを書かない(REL-U4-1 — security-design.md 禁止事項と同義)。
- 補正の冪等性を壊す非決定的な出力(順序揺れ・計算の揺れ)を入れない(REL-U4-2/3)。
- lock + validatePublishTarget + publishAtomic 以外から map を書かない(REL-U4-4)。
- 既存の verdict/result 型・CLI 引数面・エラー文言を「改善」しない(REL-U4-5 — 既存テスト期待値の保護)。
- 新規分岐をテストなしで持ち込まない(REL-U4-6)。
