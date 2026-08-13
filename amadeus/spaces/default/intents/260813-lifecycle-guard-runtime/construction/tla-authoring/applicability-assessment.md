# TLA+ Authoring — 適用判定(terminal not-applicable)

上流入力(consumes 全数): requirements.md — 検分対象の stable ID を同ファイルの機能/非機能要件節から全数列挙した。

- 判定日時: 2026-08-13T18:10:00Z / 判定者: conductor(stage 契約 Step 1 の host-workflow 経路)
- 検分 ref: conductor HEAD `62516c324`(squash 取込 `96f8a9b90` を含む着地面。PR #2986 head)

## 検分した識別子(全数)

FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, FR-7, FR-8, FR-9 と非機能要件 3 項(監査 / 決定性 / 性能不宣言)。AC 系独立 ID・ADR ID は本 intent に存在しない(設計文書 docs/reference/26 は FR-9 の成果物)。

## 選定根拠(全 ID の採否)

選定基準(stage 契約 Step 1-2): 「並行または再開可能なアクターが状態を共有し、安全性違反が無音で残りうる振る舞い」。

- FR-1〜FR-4(Interface / 迂回不能 / fail-closed 集約 / 無権限性): Guard Runtime は**単一プロセス・同期・決定的**な評価器で、拒否は error()/typed error で loud に顕在化する。共有状態を持つ並行/再開可能アクターを導入しない(評価中の状態不変はテストで固定)。→ 非該当
- FR-5〜FR-6(信頼区分 / 棚卸し分類): 登録所有権とデータ分類であり並行プロトコルでない。→ 非該当
- FR-7〜FR-9(回帰 / 対照テスト / 設計記録): 検証・文書性質であり subject でない。→ 非該当
- 登録済みモデルとの照合: 変更ファイル `amadeus-state.ts` は **PrConvergenceGate** の実装エントリだが、本変更はガード述語・順序・結果を無変更で移設する implementation-only 改修(回帰テストで判定・文言バイト一致を固定、AUTO_DECIDED `3fe86a60` で impl-only 裁定済み、`updateModelMap --impl-only` によりピン更新済み)。到達可能挙動の変更なし — spec-change advisory は formal-model-check single 実行(全 3 モデル実TLC **NOT_DETECTED** ×2 回: runId 48d35db6/07f6bdf7/4361b443 ほか)で解消済み。FormalElection / MirrorLifecycle の実装エントリは本変更で非接触(`git diff --name-only 8b6089275..96f8a9b90` に election/mirror 系ファイルなし)。

## 判定

選択集合は**空** — stage 契約「If no subject meets the formal-model criterion, record a terminal not-applicable assessment with the inspected identifiers and stop the stage successfully」に該当し、authoring 工程へ進まず正常終了する(human approval を要する impl-only/non-target receipt 経路とは異なる、空集合の terminal 経路。先例: 260812-tla-proof-receipt の同判定)。
