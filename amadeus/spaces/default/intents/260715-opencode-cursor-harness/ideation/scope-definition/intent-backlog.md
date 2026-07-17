# Intent Backlog — opencode / Cursor harness 対応(proto-Units、MoSCoW)

intent: `260715-opencode-cursor-harness`(Issue #626)
上流入力: `../intent-capture/intent-statement.md`、`../feasibility/feasibility-assessment.md`(port 容易度序列)、`../feasibility/constraint-register.md`(C-O2 walking-skeleton / C-O3 並行上限)。優先度は MoSCoW、順序は walking-skeleton 規律+risk-first。

## Backlog(優先順)

| # | proto-Unit | MoSCoW | 根拠・依存 |
| --- | --- | --- | --- |
| B-1 | **opencode walking skeleton**: `harness/opencode/manifest.ts` + `dist/opencode/` 生成 + `--version` / `--doctor` 起動導線(最小 e2e スライス、単独ゲート) | Must | C-O2。feasibility 実測で port 容易度最高(.opencode/{agents,commands,skills} が Claude 型)。Bolt 1 |
| B-2 | **opencode 実行モデル文書化+invocation surface 完成**: AGENTS.md/opencode.json 例・permission 設定例・basic workflow start・smoke/drift check 編入 | Must | B-1 の上に積む。R-4(権限既定全許可)の文書化を含む |
| B-3 | **Cursor 実行モデル文書化(RE 先行検証込み)**: rules(.mdc)/AGENTS.md/mcp.json/headless CLI の版付き実測、hook seam の反証確認(R-1) | Must | risk-first — Cursor 側の最大不確実性を skeleton 直後に潰す |
| B-4 | **Cursor port**: `harness/cursor/manifest.ts` + `dist/cursor/` 生成 + 起動導線(rules/コマンド surface)+ smoke/drift check 編入 | Must | B-3 の実測結果に依存。opencode とはファイル非交差で並行可(C-O3 上限内) |
| B-5 | **README / harness guide 更新**: 両ハーネスの対応状況・制限(機能差)・権限モデル差の記載 | Must | B-2 / B-4 の成果に依存(最後)。docs-language-ownership 遵守 |
| B-6 | hook 相当の高度統合(audit heartbeat / statusline / stop 強制の再現) | Won't(本 intent) | 受け入れ条件外。実測結果を踏まえ後続 intent として Issue 化を判断 |
| B-7 | TAKT executor 互換 | Won't(非目標 verbatim) | Issue #626 非目標 |

## 価値ストリーム(要約)

利用チーム(opencode / Cursor)にとっての価値到達点は「自ハーネスで basic workflow start が動く」こと。B-1→B-2(opencode 系)と B-3→B-4(Cursor 系)は独立に価値へ到達し、B-5 が発見可能性(ドキュメント)で価値を完成させる。

## Delivery 支援観点(amadeus-delivery-agent)

- Bolt 1 = B-1 単独・ゲート付き(walking-skeleton)。出荷後にラダープロンプト(自律 or 全ゲート)— org.md 既決
- B-2 と B-3 は非交差なら並行ディスパッチ可(cid:code-generation:c6 の非交差判定を着手前に実施)
- 正確な Bolt 分割・並行度は delivery-planning ステージで確定する(本 backlog は proto-Unit の序列まで)
