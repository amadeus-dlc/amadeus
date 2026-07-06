# 制約台帳（260705-github-kanban-sync）

上流入力: [intent-statement.md](../intent-capture/intent-statement.md)、[build-vs-buy.md](../market-research/build-vs-buy.md)

## 技術制約

| ID | 制約 | 出所 |
|---|---|---|
| C01 | 正はローカル成果物（`intents.json`、`aidlc-state.md`）。GitHub board は表示専用の鏡で、一方向 sync とする | GD009、intent-capture learning c2 |
| C02 | 実装先はこのリポジトリ内限定。Amadeus 本体（skills、エンジン、昇格先、parity 対象）に実装しない | Maintainer 指示（market-research learning c3） |
| C03 | 依存は gh CLI（`gh api graphql`）だけ。npm 依存を増やさない | market-research Q3 = A |
| C04 | 書き込みは `gh api graphql` の mutation batch（`gh project item-edit` は 1 呼び出し 1 フィールド制約） | market-research learning c5 |
| C05 | hook 内で同期ネットワーク呼び出しをしない（PostToolUse はキュー書き込みのみ、flush は Stop / SessionEnd） | Issue #470 確定判断 |
| C06 | Projects v2 操作には `gh` 認証の `project` scope が必要。不足時は明示エラーで knock out し drop 記録 | feasibility Q3 = C |
| C07 | 暫定機構として軽量実装。堅牢化・通知系・統計を作り込まない | Maintainer 判断（本ステージ） |

## 組織・運用制約

| ID | 制約 | 出所 |
|---|---|---|
| C08 | 新規スクリプトは Bun + TypeScript、TDD（先に失敗する検証）で作る | dev-scripts ルール |
| C09 | 段階（①台帳整備、②手動 sync、③hook 結線）ごとに別 PR。merge は人間が行う | intent-statement.md、team.md |
| C10 | `intents.json`（正準台帳）への `issues` フィールド追加は実装前に Maintainer の明示承認を得る（承認取得済み: scope-definition の DECISION_RECORDED、decision-log D11） | stakeholder-map.md |
| C11 | board 作成・`gh auth refresh -s project` は人間操作 | intent-capture open question |

## 規制制約

該当なし（内部開発ツールであり、個人情報・決済・規制対象データを扱わない。Intent record の状態は GitHub 以外へ送信しない = market-research Q2 = A）。
