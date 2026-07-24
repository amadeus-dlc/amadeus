# Intent Statement — 260722-tla-plugin

上流入力(consumes 全数): なし(本ステージは consumes を宣言しない — ユーザー記述と前intent 260720-formal-verif-experiment の裁定を入力とする)

## Problem Statement(解決する問題)

並行プロトコル(状態機械・相互排除の不変量)に対する検証手段として、property-based test(PBT)は単独では不十分であることが実験で確定した — PBT はオラクル相殺により植込み欠陥7件中4件を恒久的に見逃す(cid:build-and-test:pbt-oracle-cancellation)一方、TLA+ の単一モデル完全探索は 7/7 を検出した(260720-formal-verif-experiment、eligibility-report.md)。

しかしこの検証能力は現在、実験専用資材の中に閉じている:

- TLA+ モデル(FormalElection)は `scripts/formal-verif/tla-arm.ts:329` に文字列として埋め込まれ、独立編集・レビュー・再利用ができない
- TLC 実行コア(fs-tlc-toolchain.ts、fail-closed 実行契約)は実験ハーネス経由でしか駆動できず、汎用のモデル検査エントリポイントが存在しない
- CI 面は実験スケルトン専用の `formal-verification.yml`(workflow_dispatch)のみで、常設 CI(`ci.yml`)と分断されている
- spec が変わってもモデルが未更新のまま古びるドリフトを検出する機構がない

このままでは、二層検証態勢(cid:build-and-test:two-layer-verification-posture、user decision 2026-07-22)が定めた「並行プロトコルの spec 変更時は形式検証を追加する」という運用が実行不能である。

## Target Customer(誰が恩恵を受けるか)

- **一次**: amadeus フレームワークの開発チーム(ソロ/チーム両モード) — 選挙・監査ロック・provenance 等の並行プロトコルを変更する際、形式検証を再現可能な手順で実行できる。モデル検査はコードの形式仕様に対するオフライン検証であり、運用モードに依存しない
- **二次**: amadeus フレームワークの fork 利用チーム — formal-model-check ステージはプラグインとして供給されるため、必要なチームだけが compose で opt-in でき、不要なチームのワークフローには一切現れない

## Success Metrics(成功指標)

Q1 裁定(E2E動作)より、以下すべての実測成立をもって完了とする:

1. **モデル外部化**: FormalElection モデルが `.tla` 独立ファイルとして存在し、tla-arm.ts の埋め込み文字列を置換する(挙動同値はモデル同一性検証で実測)
2. **汎用実行器**: `run-model-check.ts` が `.tla` モデルを入力に TLC 完全探索を実行し、既存の fail-closed 契約(完全探索完走の completion marker + state 統計、部分探索は HARNESS_ERROR — cid:application-design:finite-exploration-not-detected-proof)を保持する
3. **CI 統合**: `formal-verification.yml` が退役し、ci.yml 内の専用ジョブ(workflow_dispatch)が green。〔追記 2026-07-22: 実行環境は feasibility Q3 ユーザー裁定により Linux + Docker(digest 固定)へ変更 — 「macOS + JDK + sandbox」は実験時ローカル隔離手段の惰性引き継ぎと裁定。詳細は requirements.md「既決ノルムからの申告済み逸脱」を参照〕
4. **完備性 sensor の落ちる実証**: モデル⇔実装対応の完備性 sensor が、spec 変更に対するモデル未更新ドリフトを実際に検出して赤くなること(落ちる実証 — Mandated)、および正当な状態で赤くならないことの両側を実測
5. **プラグイン供給**: 上記ステージ+sensor が `plugins/<name>/` バンドルとして compose / doctor / drop のライフサイクルを通ること

## Initiative Trigger(なぜ今か)

- 260720-formal-verif-experiment が 2026-07-22 に完了し、TLA 7/7 vs PBT 3/7 の実測根拠と二層検証態勢のユーザー裁定が確定した — 実験の結論を常設運用へ移す後続作業が本intentである
- 実験資材のままでは選挙プロトコル等の spec 変更が発生した時点で「形式検証を追加する」既決運用を果たせず、検証空白が生じる

## Initial Scope Signal(初期スコープ信号)

- スコープ: `amadeus`(セルフホストのフレームワーク開発、Scope Overrides 既定)
- 本intentに含む: formal-model-check ステージ新設(plugins/ バンドル供給・opt-in)、FormalElection の .tla 外部ファイル化(1本のみ — Q5)、run-model-check.ts への TLC 実行コア一般化(tlc-toolchain 系の再利用)、formal-verification.yml 退役と ci.yml 統合、モデル⇔実装対応の完備性 sensor 新設(Q4)
- 本intentに含まない: 実験専用資材(arm-s系・eligibility系・run-skeleton-ci.ts)の退役(Q2 — 保持)、監査ロック・provenance 等の新規モデル書き起こし(Q5)、日常 CI への形式検証の一律義務化(既決態勢に反するため恒久的に対象外)
