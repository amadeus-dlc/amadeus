# Business Logic Model — U2 opencode-surface

intent: `260715-opencode-cursor-harness` / Unit: U2
上流入力: unit-of-work.md(U2)、unit-of-work-story-map.md(視点1)、requirements.md(FR-1 完成 / FR-2 / AC-6b)、application-design の components.md(C1 写像表)/ component-methods.md(C1 emit 構成)/ services.md、U1 の functional-design(business-logic-model — emission table 骨格)。

## 処理フロー(U1 emit の拡張 — 同一ファイル直列の理由)

U1 が確立した emission table(`harness/opencode/emit.ts`)へ以下のエントリを**追加**する(構造の変更なし — write⇔check 対称・fail-fast・`EmitResult.written` は U1 のまま):

1. `AGENTS.md`(projectRoot)— セッション再開・`$amadeus` 導線・amadeus-rules 参照の指針。`.md` のためトークン置換経路(package.ts 既存機構)を通る
2. `opencode.json.example` — permission 絞り込み例(既定全許可の差分対策、R-4)。JSON 厳密(コメント不可 — 説明は AGENTS.md/README 側、E-CS1 Q2 と同判断の再適用)
3. `.opencode/skills/` 合成 — orchestrator skill(SKILL.md、forwarding loop)+ session skills(codex emit の合成関数群を様式として同型実装。per-stage runner 32本は初期スコープ外 — component-methods.md C1 emit 構成(:40)の既決)

## 処理フロー(利用時 — AC-2b 完全実測)

1. U1 の最小疎通(directive 受領1回)を前提に、workflow start の完全経路を実測: `$amadeus` 相当 command → orchestrator next → intent birth(検証用 scratch、project-root override 使用 — scratch-script-discipline)→ intent-capture run-stage directive 受領
2. `--doctor` の advisory 劣化内容(`.claude` 専用ブロックのスキップ様相)を実測し、U4 の README 記載の入力として記録(AC-2c)
3. 実測記録(コマンド+exit code)は AC-6b 様式で code-summary に残す

## エラーモデル

U1 と同一(fail-fast throw / problems 経由の check 失敗 / advisory 劣化は fail しない)。新規のエラー分岐を追加しない。
