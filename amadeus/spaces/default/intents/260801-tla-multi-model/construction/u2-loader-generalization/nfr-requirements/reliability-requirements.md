# Reliability Requirements — u2-loader-generalization

**Intent**: 260801-tla-multi-model / **Stage**: nfr-requirements / **Unit**: u2-loader-generalization(C3)

上流入力(consumes 全数): business-logic-model(§1.2 fail-fast, §4 不変性, §5 テスト計画), business-rules(BR-V6, BR-D3, BR-I1〜I4, BR-P5, BR-P6), requirements(NFR-1 / NFR-2, FR-6)

本 Unit は常駐サービスではなく可用性 SLA/SLO・バックアップ/リカバリの対象を持たない。信頼性要求は「fail-closed の徹底」「欠陥クラスの分離」「決定性」「不変性 pin」として以下に固定する。

## 適用要求

| # | 要求 | 測定可能な基準 | 由来 |
|---|---|---|---|
| RR-U2-1 | **fail-closed(NFR-2)**: 未登録モデル指定・宣言不一致・byte/identity 不一致は全て明示失敗。検証ゼロ件の成功(空 models の黙認)を含め、曖昧な入力を緑で返す経路を持たない | t403 の赤ケース群(宣言漏れ/過剰宣言/aux identity/未登録選択/(条件付き)空 models)が全て規定エラーで落ちる | BR-D2, BR-S3, BR-S6, NFR-2 |
| RR-U2-2 | **欠陥クラスの分離**: リゾルバ失敗(MODULE_DEP_UNRESOLVED / CYCLE / OUT_OF_BOUNDS)は ModuleDepsError として変換せず伝播し、宣言-vs-解決のズレ(SOURCE_DRIFT)と混同しない。原因分類の喪失は診断不能を招くため禁止 | t403 伝播ケースが ModuleDepsError を返す(SOURCE_DRIFT 非変換を assert) | BR-D3 |
| RR-U2-3 | **fail-fast 直列の維持**: 検証順序 (1) map parse → (2) identity 照合 → (3) 宣言照合 → (4) entries 照合、最初の失敗で打ち切り。部分結果を返さない | 赤ケースの発火エラー種が順序どおり(統合テストの既存分類ケースが意味を保つ) | BR-V6 |
| RR-U2-4 | **決定性**: 同一 map・同一資産に対して常に同一結果(配列順序・identity 値・エラー種)を返す。非決定的要因(fs 列挙順・読込順)の混入禁止 | t403 の順序 assert、既存統合テスト green | BR-S2 |
| RR-U2-5 | **不変性 pin(FR-6 / ADR-10)**: FormalElection の identity 照合結果・frozen model receipt identity は本 Unit 前後で byte 一致。canonicalIdentity 計算式・domain 文字列・byte-pin 照合 semantics・ModelLoadErrorCode 列挙は不変 | 統合テストの EXPECTED_MODULE_IDENTITY / EXPECTED_CFG_IDENTITY 値不変で green、u2 AC3 の invariance pin green、エラーマッピングテスト(:15-61)期待値不変 | BR-I1〜I4, BR-P5 |
| RR-U2-6 | **後方互換と patch coverage 100%(NFR-1、全 Unit 共通)**: `bun run typecheck` / `lint` / 既存テストが green、patch coverage ゲート(変更行 0-hit 不許容)充足、テストは修正と同 PR。shim 期間中も u3 未着弾状態で green を維持(BR-S4) | CI green + patch gate 0-hit なし(u2 AC4) | NFR-1, BR-P6, team-practices Testing Posture |

## 非適用の判断

可用性ターゲット(SLA/SLO)・障害復旧(RTO/RPO)・データ耐久性・グレースフルデグラデーションの設定は非適用。対象は短命 CLI 検証経路で常駐しないため「落ちるべき入力で必ず落ちる・同じ入力に同じ結果」の2性質が信頼性の全てであり、RR-U2-1〜4 でカバーされる。
