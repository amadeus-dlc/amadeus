# Personas — Engine Installer（260705-engine-installer）

上流入力: [requirements.md](../requirements-analysis/requirements.md)、[stakeholder-map.md](../../ideation/intent-capture/stakeholder-map.md)

## ペルソナ一覧

| ペルソナ | 説明 | 主な関心 |
|---|---|---|
| P1: Claude 導入者 | Claude Code ハーネスで Amadeus を使いたい開発者。本リポジトリを clone してから自分の workspace へ導入する | 1 コマンドで壊れない導入。既存の settings.json・skills・aidlc/ 記録が守られること |
| P2: Codex 導入者 | Codex ハーネスの利用者。`.agents/` 配置だけで動くことを期待する | 追加配線なしの成立。Claude 固有の配線が押し付けられないこと |
| P3: 本体開発者 / CI | Amadeus 本体を開発し、配布の成立を継続検証する | eval が test:all で回り、エンジンレイアウト変更（並行 Intent）を早期検知できること |

## 優先順位

P1 が主要ペルソナである（受け入れ条件 1〜4 の直接の受益者）。P2 は検証項目（FR-4.1）を通じて、P3 は専用 eval（FR-2 系）を通じて充足する。
