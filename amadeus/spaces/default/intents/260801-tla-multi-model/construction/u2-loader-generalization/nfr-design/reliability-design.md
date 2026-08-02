# Reliability Design — u2-loader-generalization

**Intent**: 260801-tla-multi-model / **Stage**: nfr-design / **Unit**: u2-loader-generalization(C3)

上流入力(consumes 全数): reliability-requirements(RR-U2-1〜6), performance-requirements(PR-U2-3 fail-fast 共有), security-requirements(SR-U2-2 fail-closed 相互参照), scalability-requirements(SC-U2-2 決定的順序), tech-stack-decisions(TS-U2-2 単一実装共有, TS-U2-4 shim), business-logic-model(§1.2 検証順序, §2.1〜2.2 欠陥クラス分離, §3.1 戻り型・shim, §4 不変性, §5 テスト計画)

本 Unit は常駐サービスではなく、サーキットブレーカ・リトライ・ヘルスチェック・フェイルオーバ・バックアップの設計対象を持たない。信頼性設計の全ては「落ちるべき入力で必ず落ちる・同じ入力に同じ結果・既存の保証を壊さない」の3性質であり、functional-design 規定済みの機構への写像として固定する。

## NFR → 機構マッピング

| # | 要求 | 設計機構(functional-design 参照) | 検証方法(証明するテスト/AC) |
|---|---|---|---|
| RR-U2-1 | fail-closed(NFR-2)、検証ゼロ件の成功を持たない | security-design SR-U2-2 と同一機構(双方向 SOURCE_DRIFT / 未登録 MODEL_MAP_INVALID / (条件付き)空 models ガード)。曖昧な入力を緑で返す経路は error union に存在しない | t403 赤ケース群が規定エラーで落ちる(u2 AC1/AC2) |
| RR-U2-2 | 欠陥クラスの分離(リゾルバ失敗と宣言ズレを混同しない) | business-logic-model §2.1/§2.2: リゾルバ失敗(MODULE_DEP_UNRESOLVED / CYCLE / OUT_OF_BOUNDS)は `ModuleDepsError` として**変換せず伝播**し、宣言-vs-解決のズレ(SOURCE_DRIFT)とは error union 上で分離する。読取系失敗のみ `MODULE_DEP_UNRESOLVED` へ変換 | t403 伝播ケース: 循環参照 fixture が `ModuleDepsError`(kind MODULE_DEPS)を返し、SOURCE_DRIFT 非変換を assert |
| RR-U2-3 | fail-fast 直列の維持 | §1.2: (1) map parse → (2) identity 照合 → (3) 宣言照合 → (4) entries 照合、最初の失敗で打ち切り、部分結果を返さない | 赤ケースの発火エラー種が順序どおり(統合テスト既存分類ケース :118-165 が意味を保つ) |
| RR-U2-4 | 決定性(同一 map・同一資産に同一結果) | §3.1: `models` 配列は宣言順(= parser 強制の名前昇順)をそのまま使い、追加ソートなし・fs 列挙順の混入なし。identity 値・エラー種は bytes と map のみから決まる | t403 の順序 assert、既存統合テスト green |
| RR-U2-5 | 不変性 pin(FR-6 / ADR-10) | §4: canonicalIdentity 計算式・domain 文字列(model/cfg)不変、verifyAssetPath / readAsset / sourceIdentity / verifyImplementationEntries の semantics 不変、byte-pin 照合 semantics(:118-123)不変、ModelLoadErrorCode 列挙不変(新コード追加なし)。FormalElection の identity 照合結果・frozen model receipt identity は Unit 前後で byte 一致 | 統合テスト EXPECTED_MODULE_IDENTITY / EXPECTED_CFG_IDENTITY 値不変で green、u2 AC3 の invariance pin green、エラーマッピングテスト(:15-61)期待値不変 |
| RR-U2-6 | 後方互換 + patch coverage 100%(NFR-1) | TS-U2-4 / §3.1: 旧 singular API を期間限定の互換 shim として残し、内部は新パイプラインへの薄い射影に一本化(二重の検証実装を持たない)。u3 未着弾状態でも typecheck / 既存テストが green(BR-S4)。テストは修正と同 PR | CI green + patch gate 変更行 0-hit なし(u2 AC4) |

## 非適用カテゴリ

可用性 SLA/SLO・RTO/RPO・データ耐久性・グレースフルデグラデーション・サーキットブレーカ/リトライ/ヘルスチェックは非適用。根拠は reliability-requirements「非適用の判断」節のとおり: 対象は短命 CLI 検証経路で常駐せず、「落ちるべき入力で必ず落ちる・同じ入力に同じ結果」の2性質が信頼性の全てであり、上表 RR-U2-1〜4 でカバーされる。
