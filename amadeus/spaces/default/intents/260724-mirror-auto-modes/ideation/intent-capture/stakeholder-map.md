# Stakeholder Map — mirror-auto-modes

## Key Stakeholders

| ステークホルダー | 関心・期待 | 本 Intent での接点 |
|---|---|---|
| Amadeus workflow 利用者 | 設定名から挙動を予測でき、外部書き込みを制御できること | `off | prompt | auto` の選択、既定値 `prompt` |
| 複数開発者のチーム | Intent が早期に共有され、重複・競合作業を避けられること | Intent Capture 承認直後の Issue 作成と節目での同期 |
| Intent owner / conductor | GitHub 障害で workflow が止まらず、未同期を見落とさないこと | 警告、未同期状態、次の境界での再試行 |
| GitHub Issue の閲覧者 | Issue が Intent の現在地と完了状態を正しく示すこと | phase・park・workflow 完了境界の sync、完了時 close |
| Amadeus 保守者 | core・配布物・テスト・文書の契約が一致すること | スキーマ変更、engine 配線、全ハーネス投影、drift guard |
| 既存 boolean 設定の利用者 | 非互換変更を把握し、明示的に3値へ更新できること | 設定エラーと日英の移行説明 |

## Decision-makers and Influencers

| 区分 | 対象 | 責務 |
|---|---|---|
| 最終決定者 | 本 Intent の owner | モード契約、既定値、実行境界、安全条件を承認する |
| 実装決定者 | Amadeus の architect / developer | provenance、未同期状態、再試行、engine 指令を設計・実装する |
| 品質判断者 | Amadeus の quality agent | 3モードの分岐、外部操作抑止、障害時継続、drift を検証する |
| 影響者 | workflow 利用チームと Issue 閲覧者 | 可視性、確認頻度、更新ノイズに関する利用者視点を提供する |

## Communication Requirements

- 非互換変更であることを release-facing な日英ドキュメントに明記し、旧 `true | false` からの暗黙変換は行わない。
- `off`・`prompt`・`auto` について、create・sync・close の挙動を同じ表で比較できるようにする。
- `auto` の作成、同期、close の各タイミングと、安全のための provenance 条件を説明する。
- GitHub 操作失敗は Workflow を停止しない一方、未同期状態・警告・再試行予定を利用者から確認可能にする。
- core と全ハーネス配布物の契約差異を drift guard とテスト結果で保守者へ通知する。

## 明示的な非ステークホルダー

- GitHub 以外の tracker 利用者。本 Intent では transport 抽象化を追加しない。
- 外部 Issue の owner。外部作成 Issue は `auto` close の対象にしない。
