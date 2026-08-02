# Reliability Requirements — u4-mirror-declaration-drift

**Intent**: 260801-tla-multi-model / **Stage**: nfr-requirements / **Unit**: u4-mirror-declaration-drift(C7+C8-MirrorLifecycle 面)

上流入力(consumes 全数): unit-of-work(u4 節・AC1〜4), business-logic-model(§2.2 / §3.2 / §3.3 / §5 / §7.5), business-rules(BR-SC3 / BR-SU3 / BR-SU5 / BR-SU6 / BR-IO1〜4 / BR-P1〜P7), requirements(NFR-1 / NFR-2)

## 信頼性適用判定

可用性 SLO を持つサービスではないため、信頼性要求は「判定不能・部分失敗を成功と偽らない(fail-closed)」「繰り返し実行で状態がぶれない(冪等・決定性)」「既存契約を壊さない(後方互換)」の3系統に集約される。これらは requirements NFR-2(fail-closed)/ NFR-1(後方互換)と全 Unit 共通の patch gate の unit 面への具体化である。

## 要求一覧

| # | 要求 | 測定基準 | 由来 |
|---|---|---|---|
| REL-U4-1 | **fail-closed(全 Unit 共通 NFR)**: リゾルバ失敗(未解決・循環・境界外)は check では `declaration-unresolved` finding で赤、updateModelMap では `UPDATE_FAILED` 系失敗とし、「宣言なしとみなす」等の黙示 fallback を実装しない。判定不能は常に赤 | BR-SC3 / BR-SU6。BR-P5 の red 実証(t405 循環参照ケース)が green | requirements NFR-2, business-rules BR-SC3 / BR-SU6 / BR-P5 |
| REL-U4-2 | **冪等性**: flagless updateModelMap の宣言補正は冪等 — 補正直後の再実行は `MODEL_UNCHANGED` を返し map を動かさない | BR-SU3。t405 補正ケースの「2 回目は MODEL_UNCHANGED」assert が green | business-rules BR-SU3, business-logic-model §3.2 |
| REL-U4-3 | **決定性**: 同一入力(map + TLA ソース)に対し check / updateModelMap は常に同一の verdict・同一 byte の出力を返す。auxiliaries 配列は path 昇順、identity は canonical JSON + sha256 の決定的アルゴリズム、キー列挙順は canonicalRecord の規則どおり | BR-SU2 の pass 条件(補正後 map が u1 スキーマで parse 可能で再 check 緑)。t405 三者一致ケース(u4 AC3)が計算値の一意性を機械検証 | business-logic-model §3.1/§4.1, BR-SU2, ADR-1 |
| REL-U4-4 | **publish の原子性**: 宣言補正を含む全 publish は lock + validatePublishTarget + publishAtomic のみを通り、中途半端な map(半更新)を公開しない。--impl-only は aux 変化・宣言不一致の存在下で `INVALID_ARGUMENT` 拒否し、entries-only の純粋性を latch で保証する | BR-SU5 / BR-IO1〜3。BR-P6(t380 拡張3ケース: aux 変化拒否・宣言不一致拒否・非 entries フィールド deep-equal)が green | business-logic-model §3.3/§5, business-rules BR-SU5 / BR-IO1〜3 / BR-P6 |
| REL-U4-5 | **後方互換(NFR-1)**: verdict 型・`UpdateModelMapResult` 型・CLI 引数面・`diffModelMap` / safeReadFile / lock / atomic publish の semantics は不変。追加は FindingReason の2メンバのみ。FormalElection の検証結果・map 宣言は不変 | BR-I1 / BR-I2。t380・sensor 系既存4テストが期待値不変で green | requirements NFR-1, business-rules BR-I1 / BR-I2, business-logic-model §5 |
| REL-U4-6 | **patch カバレッジ 100%(全 Unit 共通 NFR)**: 変更行 0-hit 不許容。sensor 本体の新規分岐(aux 計測・宣言照合・補正・latch 拒否)は t405・t380 拡張が全て打ち、テストは修正と同 PR で運ぶ | BR-P7: patch gate 充足、`bun run typecheck` / `bun run lint` / 既存テスト green | requirements NFR-1(patch coverage ゲート), business-logic-model §7.5, BR-P7 |

## 非適用の補足

可用性ターゲット(SLA/SLO)、バックアップ/リストア、災害復旧は非適用である。根拠: 変更対象は永続状態を持たない検証ツールと repo 内 JSON 宣言であり、稼働率・データ耐久性の概念が成立しない。障害時の挙動は REL-U4-1/4 の fail-closed・atomic publish で全てカバーされる。
