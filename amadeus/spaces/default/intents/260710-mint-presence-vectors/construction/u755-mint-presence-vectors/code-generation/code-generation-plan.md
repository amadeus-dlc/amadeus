# Code Generation Plan — u755-mint-presence-vectors(fix #755)

> 上流: requirements.md(FR-1〜6 / NFR-1〜5、選挙 A/A/A 確定)。
> Test strategy: minimal(bugfix)。実装はサブエージェント worktree 隔離(c2 規律)。PR は日本語・コミットは英語。

## トレーサビリティ

| Step | 対応要件 |
|---|---|
| 1 | FR-1(カタログ単一定義)+ FR-2(N バイト判定の一般化) |
| 2 | FR-3(mint-presence 抑止)+ FR-5(fail-open 維持) |
| 3 | FR-4(tier-3 抑止) |
| 4 | NFR-3(dist/self-install 同期) |
| 5 | NFR-2(テスト固定 — カタログ import 導出) |
| 6 | NFR-1(落ちる実証) |
| 7 | FR-4/FR-5 検証+NFR-5(全検証+deslop) |

## Steps

- [ ] **Step 1: 共有カタログを `packages/framework/core/tools/amadeus-lib.ts` に新設** — 両 hook が既に import している唯一の共有モジュール(新規ファイルなし = surgical)。`MACHINE_INJECTED_TURN_MARKERS`(4 marker: `<task-notification>` / `<teammate-message` / `Another Claude session sent a message:` / `[SYSTEM NOTIFICATION - NOT USER INPUT]`)と述語 `isMachineInjectedTurnText(text): boolean`(**先頭 256 バイト以内**に marker を検出。N=256 の根拠: 実測最大 offset 39 の 6 倍余裕、コメントに記録)を export。
- [ ] **Step 2: `amadeus-mint-presence.ts` の分類器を共有述語へ差し替え** — `MACHINE_INJECTED_PROMPT_PREFIX` 定数と `startsWith` を除去し `isMachineInjectedTurnText(prompt)` を呼ぶ。前提コメント(:14-19、:45-46)を実態(カタログ+N バイト検出、#755)へ更新。fail-open 分岐(TTY / 空 / 非 JSON / prompt 不在)は無改修。
- [ ] **Step 3: `amadeus-stop.ts` tier-3 の除外に共有述語を追加** — `transcriptIsConversational` の末尾ターン分類で、`isInjectedHookFeedback` に加えて `isMachineInjectedTurnText` 該当テキストを「会話性の陽性証拠にしない」。claude/codex 両 format 経路に適用。既存の fail-closed 設計は維持。
- [ ] **Step 4: dist / self-install 再生成** — `bun scripts/package.ts` → `bun run promote:self`、同一コミット。
- [ ] **Step 5: テスト固定** — t203(mint-presence classify)にカタログ全 4 形式の抑止+人間対照の鋳造を追加。**テストはカタログ定数を import して導出**(ハードコピー禁止)。tier-3 側は stop.ts の既存テストファイルにカタログ形式の transcript ケースを追加(既存ファイルへの追加のみ、新規ランナー機構なし)。
- [ ] **Step 6: 落ちる実証(exit code 記録)** — (i) 修正前コード(dist 旧版)に形式 D の合成 stdin → HUMAN_TURN 鋳造(赤)を実測 → 修正後 0。(ii) Step 5 の新テストを修正前 dist に対して実行し fail を実測 → 修正後 pass。(iii) tier-3: カタログ形式のみの transcript が修正前は conversational 判定(または既存挙動)→ 修正後は非該当を実測。
- [ ] **Step 7: 検証+deslop** — `bun run typecheck` / `lint` / `dist:check` / `promote:self:check` / `bash tests/run-tests.sh --ci` すべて exit 0。受け入れ基準の合成 stdin 測定(A=0 / B=0 / D=0 / C=1)を最終コードで再実測。deslop 後に全検証再実行。

## 対象外(touch しない)

- `humanActedSinceGate`(amadeus-lib.ts:1544)・委任 grounding(amadeus-state.ts:1645/:1715)のロジック(NFR-4)
- 注入元(agmsg / Monitor / SendMessage)のマーカー規約
- 過去 shard(FR-6)

## 完了条件

Step 1-7 全チェック + architecture-reviewer READY + Bolt PR(日本語、claude メンバーレビュー)発行。
