# TLA+ Authoring — 適用判定(terminal not-applicable)

上流入力(consumes 全数): requirements.md — 検分対象の stable ID を同ファイルの機能/非機能要件節から全数列挙した。

- 判定日時: 2026-08-12T05:00:00Z / 判定者: conductor(stage 契約 Step 1 の host-workflow 経路)
- 検分 ref: merge commit `71523ecaf`(PR #2920 着地面)

## 検分した識別子(全数)

FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, FR-7, NFR-1, NFR-2(requirements.md の全 stable ID。AC 系 ID・ADR は本 intent に存在しない)

## 選定根拠(全 ID の採否)

選定基準(stage 契約 Step 1-2): 「並行または再開可能なアクターが状態を共有し、安全性違反が無音で残りうる振る舞い」。

- FR-1〜FR-7: いずれも referee 経路の receipt 生成・検証・fail-closed 拒否という**単一プロセス・決定的・loud** なロジック。共有状態を持つ並行/再開可能アクターは存在せず、違反は例外/非0 exit で顕在化する(無音でない)。→ 非該当
- NFR-1(決定性)・NFR-2(回帰なし): 検証性質であり subject でない。→ 非該当
- 登録済みモデル(FormalElection / MirrorLifecycle)との照合: 本変更は validator 内部実装のみで、両モデルが写像する挙動(選挙状態機械・mirror lifecycle)の到達可能挙動を変更しない(FR-4 が pin 不変を保証、既存ピン 90 pass + 実TLC NOT_DETECTED ×2 を advisory 解消時に実測済み)。

## 判定

選択集合は**空** — stage 契約の「If no subject meets the formal-model criterion, record a terminal not-applicable assessment with the inspected identifiers and stop the stage successfully」に該当し、authoring 工程へ進まず正常終了する(human approval が必要な impl-only/non-target receipt 経路とは異なる、空集合の terminal 経路)。
