# RAID Log：260704-v2-parity-completion

## 記録

| 種別 | 内容 | 影響 | 対応 |
|---|---|---|---|
| リスク | amadeus-grilling とエンジン directive の結線層が、本家エンジンの契約（next / report、questions ファイル生成）と噛み合わない | C 柱の遅延、または結線層が本家改変になりパリティ追従コストが増える | walking skeleton Bolt で結線を最初に検証し、本家改変は最小点に限定して除外リストへ記録する |
| リスク | 移行中に旧散文駆動 skill と新エンジン駆動が併存し、挙動が分裂する | 進行中 Intent の状態不整合、gate の二重提示 | 入口切替を担う Bolt を小さく保ち、切替前後で同じ Intent を触らない。完了済み record は移行しない（GD006） |
| リスク | 上流 hook（11 個）が既存の settings、hook、statusline と衝突する | 開発環境の破壊（C001 違反） | aidlc-* 名前空間でマージし、衝突は個別解消。導入 Bolt で既存環境の回帰確認を行う |
| リスク | examples 4 snapshot と skill-provenance が新契約で全面無効になる | `npm run test:examples` の長期 red（C002 違反） | examples 再生成を独立 Bolt として計画し、real provider で再生成するまで旧契約の examples を保持する順序にする |
| 前提 | 上流 `dist/claude/`（fde1e1af）は Claude Code で動作する完成品である | 崩れると適応コピーの工数見積りが無効になる | walking skeleton Bolt で最小動作確認を最初に行う |
| 前提 | Bun がこの環境で hook 実行にも使える | hook 基盤の成立条件 | 既存 dev-scripts が Bun 前提のため成立見込み。導入 Bolt で確認する |
| 課題 | 3.6 の実ファイル名は上流内で不一致（produces: build-test-results、outputs 散文: test-results.md） | パリティ検査の期待値が定まらない | エンジンの成果物解決の実装を正とし、パリティ検査もエンジン定義から期待値を導出する |
| 課題 | 上流の `aidlc/` seed（spaces 雛形、.gitignore、.mcp.json）と既存 `aidlc/` 実データの整合 | 既存 record の破壊（GD006 違反） | seed はコピー対象から除外し、既存 `aidlc/` を正とする。差分は除外リストに記録する |
| 依存 | awslabs/aidlc-workflows v2（基準 commit fde1e1af、MIT-0） | パリティ検査の基準 | C003 のとおり commit 固定、明示更新 |
| 依存 | Bun、amadeus-validator | エンジン実行と横断構造検査 | 既存基盤をそのまま使う |
