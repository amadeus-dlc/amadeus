# Units Generation — 質問票

- **Intent**: `260807-stage-perf-report`
- **Stage**: units-generation (2.7 / INCEPTION)
- **Mode**: chat(質問 0 件 — 下記判定)

## 質問しない事項(既決 — 前提として成果物へ反映)

`cid:intent-capture:c1`(既存の流儀・既決事項は質問しない)および既決ノルムからの一意導出により、本ステージの質問は **0 件**。

- Unit 境界戦略・粒度: `cid:units-generation:c1`(a)「独立に実装可能で利用者価値を出荷できない境界は単一 Unit へ統合」+ `cid:reverse-engineering:free_text_1`「1 Issue = 1 Unit 原則」から一意導出 — 対象は単一ファイル CLI(components.md: 約 700〜900 行)で、純関数コア単独では利用者価値を出荷できないため **単一 Unit** が既決ノルムの適用結果
- 依存順序: 単一 Unit のため依存グラフは自明(エッジなし)— 並列機会の設計判断は発生しない
- 統合ポイント: component-dependency.md で確定済み(外部依存は `amadeus-journal.ts` のみ、同期インプロセス呼び出しのみ)
- デプロイモデル: NFR-4 で確定済み(`packages/framework/core/tools/` 配置 → coreDirs で全ハーネス投影 — 既存ビルド経路に埋め込み、独立デプロイなし)
- Unit kind: UNIT_KINDS 閉語彙(service|spec|ui|packaging|library)のうち、単発実行の CLI 実行可能物として `service` を適用(`cid:units-generation:c2-edgeblock-nested-kind-required` の kind 必須契約に従う)

## 裁定の記録

- 質問 0 件の判定根拠: 全事項が既決ノルム(units-generation:c1 / 1 Issue = 1 Unit)と承認済み上流成果物(application-design 5 点・requirements.md)から一意に確定(E-OC1 判定種別: 既決ノルム・承認済み上流による既決)。
- ユーザー承認: 2026-08-07T15:33:16Z(Step 5 プラン承認 — 「Approve Plan(推奨)」を選択: 単一 Unit(stage-stats-cli, kind=service)+質問 0 件判定を承認)
