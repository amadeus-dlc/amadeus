# Team Practices — solo-election(差分評価)

上流入力(consumes 全数): code-structure.md(選挙5ファイルの配置と投影面)、technology-stack.md(Bun/TS/ESM 前提)、dependencies.md(新規依存なしの確認)、code-quality-assessment.md(選挙面の品質シグナル)、architecture.md(選挙サブシステム現在節 — 指令返却 transport・機械固定 SKILL)、business-overview.md(フレームワーク全体文脈)。

## 評価方式

本日実施の RE(差分リフレッシュ、observed `3eba39a90`)がスキャン面(コード構造・テスト・CI・スタイル)をカバーしているため証跡スキャンは codekb で代用し(cid:practices-discovery:c1)、affirmed 済み team.md / project.md との差分ギャップのみを評価した(cid:practices-discovery:c2 — 無変更セクションの live 温存)。

## 差分評価の結論: 変更なし

- 本 intent の作業様式(TS/Bun・`packages/framework/core/` 正本・7ハーネス dist 同期・Biome/typecheck・tests/run-tests.sh 4層)は現行 project.md の Way of Working / Tech Stack / Testing Posture と完全に一致し、新しい実践の発見なし。
- 選挙固有の規範(CLI 正本主義 cid:election-cli-canonical、GoA スケール、blind 配布)は team.md に affirm 済みで、本 intent はその適用先を増やすだけ。
- **team.md ソロモード節の改定(2体 subagent 選挙の正規化)は本 intent の実装スコープ(M-05)であり、practices-discovery の発見事項ではない** — 改定は code-generation 以降で成果物として実装し、norm 反映の経路で着地させる。ここで先取りの規則追加は行わない。
