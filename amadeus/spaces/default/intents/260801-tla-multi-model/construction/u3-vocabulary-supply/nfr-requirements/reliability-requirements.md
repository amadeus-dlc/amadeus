# Reliability Requirements — u3-vocabulary-supply

**Intent**: 260801-tla-multi-model / **Stage**: nfr-requirements / **Unit**: u3-vocabulary-supply(C4+C5+C8-FormalElection 面)

上流入力(consumes 全数): business-logic-model(§2.2 明示失敗 / §5 byte-pin / §7 不変性), business-rules(BR-V3 / BR-V4 / BR-P / BR-F / BR-G / BR-B / BR-R), requirements(NFR-1 / NFR-2, FR-6)

## 適用要件

可用性 SLA を持たない CLI ツールのため、信頼性は **fail-closed・決定論・後方互換** の3点で定量化する。

| # | 要件 | 測定可能な判定 | 由来 |
|---|---|---|---|
| REL-1 | **fail-closed(NFR-2)**: vocabulary 省略モデルの語彙要求・未登録モデルの byte-pin 要求は全て明示失敗。空配列・既定値・先頭モデル・他モデル語彙への silent fallback は存在しない | t404 省略 red ケース + 統合の未登録要求 red ケースが「落ちる実証」として green | BR-V3, BR-B2, u3 AC2/AC3 |
| REL-2 | **失敗分類の不変**: 新しいエラー kind/code を追加しない。語彙欠如は MODEL_MAP_INVALID(kind MODEL_LOAD)、toolchain 内の語彙不一致は従来どおり `failed("GRAMMAR", …)`。既存 red ケースの期待値(メッセージ文字列含む)を破壊しない | 既存テスト全件が期待値不変で green | BR-V4, BR-G3, BR-B1, NFR-1 |
| REL-3 | **決定論(語彙 pin)**: FormalElection に供給される語彙値は現行定数と順序含め一字一致。語彙を変更すると t404 が落ちる構成を維持する(保護の空洞化禁止) | t404 deep-equal pin green。語彙改変で t404 が赤になること | BR-P1, BR-P3, FR-6, u3 AC1 |
| REL-4 | **決定論(receipt/解析結果の不変)**: frozen model receipt identity・publicContractIdentity 計算式・counterexampleIdentity 計算式・TLC 出力 grammar は不変。同一入力に対する parseTlcOutput174 の出力は変更前後で一致 | 固定 publicContractIdentity に対する receipt identity の byte 一致(t404)+ 既存 identity 定数 pin 期待値不変 | BR-F2, BR-B3, BR-G5, ADR-10, u3 AC1 |
| REL-5 | **後方互換(NFR-1)**: map 変更は FormalElection エントリへの vocabulary 追加のみ。identity 値・entries 配列・MirrorLifecycle エントリ・schemaVersion は不変 | model-map.json の diff が当該フィールド追加のみであることのレビュー + model-map 系既存テスト green | BR-P4, ADR-3, ADR-10 |
| REL-6 | **patch coverage 100% ゲート**: 変更行 0-hit 不許容。テストは修正と同 PR で運ぶ。`bun run typecheck` / `bun run lint` / 既存テスト green | CI で patch gate 充足(u3 AC4、BR-R6) | requirements NFR-1, team-practices Testing Posture |
| REL-7 | **語彙なしに receipt を生成する経路を作らない**: 語彙解決失敗時は frozen 生成も失敗し、receipt キー集合は語彙集合と一致する | BR-F4 の構造規則。validateFrozenTlaModelReceipt の closed-set 検査が語彙引数由来であること | BR-F4, business-logic-model §4.2 |

## 非適用とする領域(根拠)

- **可用性目標(SLA/SLO)・障害復旧(RTO/RPO)・バックアップ**: 常駐サービス・永続状態を持たず、失敗は即座の非ゼロ終了として表面化する短絡 CLI のみ。状態は git 管理の repo 内ファイルであり、別途の耐久性要件は存在しない。
- **グレースフルデグラデーション**: NFR-2 の fail-closed 方針と矛盾するため採用しない — 退化動作(silent fallback)は禁止事項(REL-1)である。
