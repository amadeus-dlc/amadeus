# Stakeholder Map — ソロ向けスタンディング承認グラント

上流入力（consumes 全数）: なし。一次入力は [GitHub Issue #1466](https://github.com/amadeus-dlc/amadeus/issues/1466) とユーザーの直接回答。

## Stakeholders

| ステークホルダー | 関心 | 必要な結果 |
|---|---|---|
| ソロモード利用者 | 通常ステージごとの停止を減らし、重要境界だけ確認したい | Intent限定・期限付きの明示グラントとPhase境界での停止 |
| Amadeus自己開発者 | `amadeus-*` スコープ間で挙動を揃えたい | スコープ名の固定列挙に依存しないゲート分類 |
| チームモード利用者 | 既存のスタンディング委任を壊したくない | 現行の発行・委任・監査契約の後方互換 |
| 監査・レビュー担当者 | 誰が何を承認したか追跡したい | HUMAN_TURN provenance、Grant Id、通常のゲートイベント |
| Amadeus保守者 | fail-closed 性と状態機械の整合を守りたい | Intent隔離、失効・撤回、明示的なgrant-covered状態、退行テスト |

## Decision Rights

- グラントの発行・撤回、Phase 境界での承認、例外判断は人間利用者が所有する。
- グラント適格性、Intent一致、期限、撤回、Phase境界、Walking Skeleton の判定は決定的なエンジンが所有する。
- 成果物の品質判定は既存のartifact guard、sensor、reviewer、testが所有し、グラントはこれらを迂回しない。
- PRマージなど不可逆な外部操作は本機能の対象外であり、既存の人間承認境界を維持する。

## Communication Requirements

- 発行時に対象Intent、期限、Phase境界を含むかを明示する。
- `--doctor` と状態確認で、有効グラント、残り時間、対象Intentを確認できるようにする。
- 自動承認されたゲートは `Grant Id` を監査証跡へ残す。
- グラントが適用できない場合は黙って自動承認せず、通常の人間ゲートへ戻す。
