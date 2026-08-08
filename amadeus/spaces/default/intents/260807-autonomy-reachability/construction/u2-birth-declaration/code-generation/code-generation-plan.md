# Code Generation Plan — u2-birth-declaration

上流入力(consumes 全数): functional-design/domain-entities.md(carry ラッチと宣言エンティティ)、functional-design/business-logic-model.md(birth 同時宣言フロー・テスト契約改訂表・エラー分類)、functional-design/business-rules.md(BR-U2-1〜7)、nfr-design/reliability-design.md(失敗様式)、nfr-design/logical-components.md(論理構成)、nfr-design/security-design.md(認可境界の不変)。補助参照: inception/requirements-analysis/requirements.md(FR-1a〜1d)、elections/260808-e-u2blk/record.md(ブロッカー裁定)。

本 plan は invoke-swarm 経路のディスパッチブリーフと確定裁定を正本として、着手時点の計画を記録する(cid:code-generation:swarm-unit-artifact-backfill による conductor 事後作成)。

## 受け入れ基準(requirements.md FR-1 逐語)

- **FR-1a**: `/amadeus --autonomy <none|semi> "<説明>"` は birth と同時に受理し、birth 直後の同一 `next` 連鎖内で mode を適用する。適用は canonical(`applyProductionAutonomyMode`)経由とし、provenance は実 HUMAN_TURN(フラグ自体は provenance にならない)
- **FR-1b**: `--autonomy full` は birth を成立させたうえで、grant 儀式を経ずに mode を設定しない — preview 相当を出して確認待ち fail-closed 停止
- **FR-1c**: `tests/integration/t450-autonomy-flag-branch.test.ts:83` と `tests/unit/t450-autonomy-flag-apply.test.ts:95` を明示改訂(改訂前後の赤/緑と改訂後×修正前実装の対角を記録)
- **FR-1d**: seam は judgment 0 と Branch 4ab 配置。新規 intent の e2e で「birth → 最初のステージ directive が `intent_autonomy_mode` を搬送」を1コマンドで実測固定

## ブロッカーと確定裁定(E-U2BLK)

builder が実装前停止で報告し conductor が独立実測で確認した構造的ブロッカー: 新規 birth 直後の intent では `applyProductionAutonomyMode` が必ず `PROVENANCE_REQUIRED` で失敗する(`latestHumanTurnId` は当該 intent 自身のシャードのみ走査し、birth は HUMAN_TURN を mint しない。打鍵時の mint はオンディスクのカーソルで active intent を解決するため旧 intent のシャードへ落ちる)。

ソロ選挙 E-U2BLK は 1-1 の tie となり、エスカレーション正準リスト(1)によりユーザー裁定(2026-08-08)で **参照側を広げる**が確定した。実装契約:

1. 拡張参照は semi/none の birth 同時宣言に限定。grant 発行(full)経路の provenance 要求は緩めない。既定は現行の intent スコープ厳格参照(fail-closed 既定)
2. 受理するのは実在の HUMAN_TURN のみ(新規 mint しない)。同一セッション連鎖に属することを実測可能な形で判定する
3. 拡張参照でも実在 HUMAN_TURN が見つからない場合は loud に失敗して案内。first-declaration ラッチを消費せず再宣言で回復
4. FD の「intent-birth が canonical 適用」と BR-U2-3(full は intent-birth が受理し儀式手順を印字して停止)は維持
5. `amadeus-orchestrate.ts` の既存設計コメント(mode の投影は routeMainWorkflowDirective の専任)は改訂しない

## 実装方針

- **Part A(拡張参照)**: `applyProductionAutonomyMode` に `provenanceScope?: "intent" | "launch-chain"`(既定 `"intent"`)を追加。`full` × `launch-chain` は turn 探索の前に `PROVENANCE_SCOPE_FORBIDDEN` を返し、grant 経路を構造的に到達不能にする。`launch-chain` の述語は ordinal(実在の HUMAN_TURN / 自 record の presence ledger で未消費 / 誕生 intent の最古監査タイムスタンプ以前 / space 内横断で最新)
- **Part B(orchestrate の carry)**: `LaunchAutonomyOutcome` に `carry` を追加。到達性判定(`birth` / `ask` / `none`)を judgment 0 より前に置き、carry ラッチを birth print directive の emit 点で消費する。`emit` に backstop を置き、未消費ラッチを loud error に変換して無音消失を塞ぐ
- **Part C(intent-birth)**: `--autonomy` を受理し、`none|semi` は canonical 適用、`full` は儀式手順を印字して停止

## テスト番号予約

`t490`(integration)/ `t491`(unit、必要な場合)。実 FS は integration、純関数は unit へ。

## 検証コマンド(exit code を個別捕捉)

`bun run typecheck` / `bun run lint` / 対象テスト(t449 全部・t450×2・t481・t490)/ `bash tests/run-tests.sh --ci` / `bun run build` → `git status --short`。coverage 実行は conductor が直列所有。
