# Reliability Requirements — u5-ci-all-models-measure

**Intent**: 260801-tla-multi-model / **Stage**: nfr-requirements / **Unit**: u5-ci-all-models-measure(C6+C9+C10)

上流入力(consumes 全数): business-logic-model(u5 functional-design §2.2 / §3 / §7.3 / §8 / §10 — 短絡 semantics・二層検証・pin 強度・エスカレーション・不変性), business-rules(BR-M2〜M3 / BR-E2 / BR-S1〜S3 / BR-T1〜T2 / BR-F1〜F2 / BR-O2), requirements(NFR-1, NFR-2, FR-6)

本 Unit は可用性 SLA を持たない CI 検証ツールであり、信頼性 NFR は **fail-closed(偽緑の禁止)**・**決定性**・**後方互換の不変性**として定量化する。

## RR-1: fail-closed(偽緑禁止、NFR-2)

- 要件: 次の異常は全て**明示失敗**とし、silent fallback を禁止する。
  - 未登録モデル名: 全 CLI で exit 2(BR-S2)。
  - skeleton の非 FormalElection 指定: exit 1 の意図的 fail-closed(BR-S1)。
  - 宣言不一致・byte 不一致: loader / sensor が赤化(u2/u4 の検出点を消費)。
  - MirrorLifecycle の TLC 異常: 「completion marker 不在 or exit ≠ 0 or stderr 非空」を red surface とする(BR-M2)。反例を含む TLC 非 0 終了が成功に化けないことを保証。
  - run 失敗時の短絡: いずれかの run 失敗で run-failure.json + verification.json(pass:false)を書き exit 2(現行 semantics 不変、failure レコードに model フィールド追加)。
- 検証: t406 の注入 → red → 除去 → green の**往復 assert**(BR-M3 — 片方向のみの red は検査の空洞化を許すため不採用)。

## RR-2: 決定性(統計 pin)

- 要件: MirrorLifecycle measured run の TLC 統計は基準値(208,628 / 89,099 / depth 18 / queue 0)と**完全一致**を要求(BR-E2)。TLC は固定 jar・workers 1・同一 cfg で決定的であり、非決定的な振る舞い(flaky)を設計に持ち込まない。不一致時は verify 赤とし、値を黙って更新しない。
- warm-up run は統計 pin 対象外(completion marker のみ — BR-E3)。

## RR-3: 後方互換・不変性(NFR-1、FR-6)

- 要件: frozen 層(FormalElection)の挙動は byte 不変(spawn argv / frozen receipt identity / parseTlcOutput174 semantics / exit code マッピング)。toolchain 4 ファイル(tlc-toolchain / fs-tlc-toolchain / run-model-check-execution / tla-arm)には触れない(BR-F1)。既存 CI 契約(bootstrap supply-receipt / validateDockerReceipt / EnvReceipt 行列 / acceptance スキーマ名)は不変(BR-F2)。
- 検証: FormalElection 分の既存テスト期待値は不変、identity pin は据え置き。

## RR-4: 部分失敗時のふるまい(graceful degradation)

- 要件: 優雅な縮退は**提供しない**(検証ツールの性質上、部分成功 = 偽緑の温床)。timeout 超過・統計不一致・部分的成功のいずれも、緩めて green を取らず証跡化して要件再裁定へエスカレーションする(BR-T1/T2、BLM §8.5)。

## RR-5: patch coverage 100%(全 Unit 共通)

- 要件: 変更行 0-hit 不許容。テストは修正と同 PR で運ぶ。`bun run typecheck` / `bun run lint` / 既存テスト green(BR-O2、team-practices Testing Posture、NFR-1)。

## N/A 判定

- 可用性目標(SLA/SLO/稼働率): **N/A** — 手動起動の CI ジョブであり、サービスとしての稼働率概念を持たない。成功基準は run 単位の verdict(green/red)であり RR-1/RR-2 でカバー。
- バックアップ / 災害復旧 / データ耐久性: **N/A** — 永続データを持たない(evidence は CI artifact、record への証跡固定は git 管理のドキュメント)。
