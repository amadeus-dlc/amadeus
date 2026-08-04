# Stakeholder Map — ハーネス横断 live E2E

Intent: `260803-harness-live-e2e`  
入力正本: [Issue #1717](https://github.com/amadeus-dlc/amadeus/issues/1717)

## Key Stakeholders

| ステークホルダー | 役割 | 主な関心事 |
| --- | --- | --- |
| リポジトリオーナー | 意思決定者 | Issue #1717 の価値境界、仕様変更、各承認ゲート、PR マージの最終判断 |
| Amadeus ハーネス保守者 | 主対象・実装者 | 共通 contract を再利用しつつ、各 CLI の能力差を adapter 内へ閉じ込めること |
| ハーネス配布面を変更する開発者 | 主対象・運用者 | 変更した adapter の短い live journey をローカルで安全に実行し、結果を記録できること |
| Codex CLI 利用者 | 既存受益者 | 現行 live E2E と認証隔離の挙動が退行しないこと |
| Claude Code 利用者 | Phase 1 受益者 | `claude -p`、Agent SDK、TUI の各経路で適切な opt-in と CI deny が働くこと |
| Kimi Code・Kiro CLI・Kiro IDE 利用者 | Phase 2 受益者 | 各 transport 固有の認証・設定境界を維持したまま共通 policy を利用できること |
| Cursor・OpenCode 利用者 | Phase 3 受益者 | 非対話実行・設定隔離・認証利用の実能力が測定され、対応可否が曖昧なまま残らないこと |
| CI・リリース運用者 | 影響を受ける側 | live process が GitHub Actions で確実に拒否され、通常 CI の安定性とコストを損なわないこと |
| 認証情報の所有者 | セキュリティ上の利害関係者 | source auth/config を scratch や child environment へコピー・漏えいしないこと |

## Decision-Makers and Influencers

- **最終意思決定者**: リポジトリオーナー。ユーザー可視契約の変更、Intent の承認ゲート、PR マージを裁定する。
- **実装判断の主体**: Amadeus ハーネス保守者。承認済み要件と設計の範囲で、共通 seam と adapter 境界を具体化する。
- **能力上のインフルエンサー**: 各ハーネス CLI の公式仕様と実機挙動。非対話実行、設定 source、認証、終了条件の実測結果が設計可能範囲を制約する。
- **検証上のインフルエンサー**: 既存 live driver と test runner。現行の opt-in、timeout、debug workspace 保持、skip 表現を移行時の比較基準とする。

## Communication Requirements

- Intent の設計正本と裁定は `amadeus/spaces/default/intents/260803-harness-live-e2e/` に置く。
- GitHub 上の共有状態は [Mirror Issue #2132](https://github.com/amadeus-dlc/amadeus/issues/2132) に一方向同期し、入力元の [Issue #1717](https://github.com/amadeus-dlc/amadeus/issues/1717) を要件由来として保持する。
- ハーネスごとの capability は、確認した CLI version、実行条件、成功・不成立の根拠、最終 live green SHA を capability matrix に記録する。
- 認証情報、ユーザー設定、ローカルパスなど公開に適さない情報は成果物・Issue・テストログへ転記しない。
- adapter を接続できない場合は「要調査」のまま終えず、阻害要因、推奨 seam、受け入れ条件、参照 Issue を記録する。
- live test の結果は skip、timeout、実失敗を区別し、実行した SHA と adapter を追跡可能にする。
