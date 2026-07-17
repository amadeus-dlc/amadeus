# RAID Log — opencode / Cursor harness 対応

intent: `260715-opencode-cursor-harness`(Issue #626)/ 上流: `../intent-capture/intent-statement.md`。状態は本ステージ時点(2026-07-16)。

## Risks(リスク)

| ID | リスク | 影響 | 確度 | 緩和策 |
| --- | --- | --- | --- | --- |
| R-1 | Cursor に決定的 hook seam(SessionStart/Stop/PostToolUse 相当)が無い/不安定で、audit heartbeat・statusline・stop 強制が再現できない | 中 — ワークフロー品質の一部機能差 | 中(本調査で未確認 = 不在とは断定しない。RE 段で反証確認) | engine ツール自身の audit emit は hook 非依存で機能する(実測: 全 emission はツール所有)。機能差は README/harness guide に明記(intent-statement 非目標「機能差を隠さない」) |
| R-2 | opencode/Cursor の設定仕様が活発に変化し、調査時点の受け取り単位が実装時に変わる | 中 | 中 | 成果物に照会日を記録。RE/design 段で版付き再実測。壊れやすい面(ファイルパス・frontmatter 形)は smoke test で検出可能にする |
| R-3 | 新 dist ツリー追加により dist:check / promote:self:check / coverage registry の宇宙が変わり、既存 CI が偽赤/衝突する | 中 | 低〜中 | integration-registry-regen / shared-ledger-insert-collision の既存ノルムに従い、統合工程で registry 再生成を必須ステップ化 |
| R-4 | opencode の権限既定が全許可のため、同梱設定例の安全既定が Claude の pre-approve モデルと意味論的に異なる | 低 | 高(仕様として確定) | `permission` 設定例を同梱し、README に権限モデルの差を明記 |

## Assumptions(前提)

| ID | 前提 | 検証状態 |
| --- | --- | --- |
| A-1 | `discoverHarnessNames()` は manifest.ts を持つ新ディレクトリを追加編集なしで発見する | 検証済み(package.ts:64-71 実読、コメント「zero edits here」) |
| A-2 | opencode は `.opencode/{agents,commands,skills,plugins}` + `opencode.json`(JSON/JSONC)+ AGENTS.md を受け取る | 公式 docs 実測(2026-07-16、opencode.ai/docs/config)。実機検証は未(RE/skeleton で実施) |
| A-3 | Cursor は `.cursor/rules/*.mdc` + AGENTS.md + `.cursor/mcp.json` を受け取り、CLI `agent -p` で headless 実行できる | 公式 docs 実測(2026-07-16、cursor.com/docs)。実機検証は未(RE/skeleton で実施) |
| A-4 | 両ハーネスとも作業ディレクトリで `bun .claude/tools/...` 相当の shell 実行が可能(engine ツール直叩き) | 仮説(高確度 — 両者とも shell 実行を持つ)。skeleton Bolt で実証 |

## Issues(課題)

| ID | 課題 | 状態 |
| --- | --- | --- |
| I-1 | (現時点でオープンな課題なし — 前 intent からの引き継ぎ RAID もなし。本 intent は新規) | — |

## Dependencies(依存)

| ID | 依存 | 方向 |
| --- | --- | --- |
| D-1 | `scripts/package.ts` / `scripts/promote-self.ts` の既存 packaging 基盤 | 本 intent が依存(変更は原則不要の想定) |
| D-2 | 並行 intent 260709-canonical-settings との codekb 共有(RE diff-refresh の base・c3-relabel) | 相互調整(record-sync PR の即時性で衝突最小化) |
| D-3 | opencode / Cursor の外部仕様(受け取り単位・CLI 挙動) | 外部依存(版付き再実測でトラッキング) |
