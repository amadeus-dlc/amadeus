# Initiative Brief — opencode / Cursor harness 対応(1枚もの)

intent: `260715-opencode-cursor-harness` / [Issue #626](https://github.com/amadeus-dlc/amadeus/issues/626)(enhancement / P2)/ scope: `amadeus`(18/32 stages, Standard depth)

## Intent と課題(出典: ../intent-capture/intent-statement.md)

Amadeus の harness-neutral core は現在 Claude / Kiro / Kiro-IDE / Codex の4ハーネスに投影されている。opencode / Cursor の利用チームは AI-DLC workflow を実行できない — roadmap の North Star(cross-harness reusability)の未達領域。本 intent は両ハーネスを追加 harness port として対応する。

## 市場検証サマリ

market-research はスコープ SKIP(フレームワーク自己開発 intent のため)。投資判断の根拠は市場調査ではなくユーザー自身の起票(Issue #626)と roadmap North Star への整合。

## 実現性とリスクのハイライト(出典: ../feasibility/feasibility-assessment.md)

- **総合判定: 実現可能(高確度)** — `package.ts:64-71` の manifest 自動発見 seam により core 編集ゼロで harness 追加可能(実測)。codex manifest(66行)が port テンプレート
- **外部実測(2026-07-16)**: opencode は `.opencode/{agents,commands,skills,plugins}` + `opencode.json` + AGENTS.md(Claude 型で port 容易度最高)。Cursor は `.cursor/rules/*.mdc` + AGENTS.md + `.cursor/mcp.json` + headless CLI
- **最大リスク R-1**: Cursor の決定的 hook seam 未確認 → RE で反証確認し、機能差として文書化で吸収(代替緩和込み、raid-log 参照)
- 制約は ../feasibility/constraint-register.md(C-T1〜C-T7 / C-O1〜C-O4)を正とする

## スコープ境界(出典: ../scope-definition/scope-document.md)

In = Issue 受け入れ条件7項(実行モデル文書化 / harness surface / dist 生成 / 起動導線 / 無回帰 / smoke・drift check / README)。Out = 非目標4項+高度統合。到達ライン = 両ハーネスで `--doctor` / `--version` / basic workflow start。

## コンセプト可視化

UI なし(CLI/配布フレームワーク)。出力契約は設計ステージで既存兄弟ツールの既習様式に揃える(ui-less-mockups-as-output-contract)。

## チーム計画

チームモード運用(conductor = e3、leader ゲート執行、レビューは実装者以外)。Construction は walking-skeleton(B-1 = opencode 最小スライス、単独ゲート)→ ラダープロンプト → 並行 Bolt(上限4)。backlog 序列は ../scope-definition/intent-backlog.md(B-1〜B-7)。

## Go / No-Go 推奨

**Go を推奨** — 実現性高確度・既存 seam 適合・リスクはすべて緩和策付き・スコープ境界は Issue 受け入れ条件で客観確定済み。No-Go 要因(規制・予算・技術的不可能性)は検出されていない。
