上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

# Business Logic Model — kimi-hook-adapter

unit-of-work.md の U2(完了定義: adapter+lib 実装・全9イベントの live capture・変換表固定・契約テスト green)と unit-of-work-story-map.md の FR-2/FR-7a を、components.md C2 と component-methods.md の C2 インターフェース(routeTarget/normalizePayload/translateStopOutput/translateSessionStartOutput)に沿って手続き化する。services.md の判定どおり adapter は無状態の短命プロセス。

## dispatch フロー(実行時)

1. Kimi CLI が `[[hooks]]` の matcher に合致するイベントで `bun .kimi-code/hooks/amadeus-kimi-adapter.ts <target>` を起動(cwd = セッションのプロジェクト dir)
2. shim が stdin を読み、`routeTarget(target)` で処理対象を解決:
   - `session-start` → core `amadeus-session-start.ts`
   - `session-end` → core `amadeus-session-end.ts`
   - `mint` → core `amadeus-mint-presence.ts`(UserPromptSubmit と PostToolUse(AskUserQuestion)の2配線が同一 target に来る)
   - `audit-and-sensors` → core `amadeus-audit-logger.ts` + `amadeus-sensor-fire.ts`(PostToolUse(Write|Edit)で fan-out)
   - `state-sync` → core `amadeus-sync-statusline.ts`(PostToolUse(TodoList)の payload を core hook が消費する既存の状態同期形状へ写像 — 正確な形は core hook 側が定義し、capture で確認する)
   - `runtime-compile` → core `amadeus-runtime-compile.ts`(PostToolUse(Bash))
   - `validate-state` → core `amadeus-validate-state.ts`(PreCompact)
   - `log-subagent` → core `amadeus-log-subagent.ts`(SubagentStop)
   - `stop` → core `amadeus-stop.ts`
3. `normalizePayload(event, raw)` が Kimi の payload を Claude 契約へ正規化(フィールド欠落は既定値で補完、未知フィールドは透過的に落とす)
4. core hook の stdout/exit を `translate*` で Kimi 契約へ中継。Stop のみ block 契約を verbatim に扱う

## live capture 手順(変換表の確定)

1. `~/.kimi-code/config.toml` をバックアップ(Q1 承認の手順: バックアップ・マーカー・除去)
2. probe 用 managed block を追記: 各イベントで stdin を capture ファイル(repo 外の scratch)へ tee してから adapter へ渡す薄い probe shim を挟む
3. 各イベントを最小コストで発火: `kimi -p` の短いセッションで、prompt 投稿(UserPromptSubmit)・Bash/Edit/Write/TodoList/AskUserQuestion の各ツール使用(PostToolUse)・セッション開始/終了(SessionStart/SessionEnd)・subagent 起動/完了(SubagentStart/SubagentStop)・ターン終了(Stop)・手動 compact(PreCompact)を誘発
4. capture を収集してフィールド表(イベント × 実在フィールド)を作り、変換表を `amadeus-kimi-lib.ts` に固定
5. probe block を除去し、config を復元状態と突合(バックアップとの diff で managed block のみが残る/消えることを確認)

## 契約テスト

- capture 済み payload(fixture)を lib に in-process で流し、core hook 効果(audit 行・block 中継・fail-open)を断言(t-cursor-adapter 様式: spawn spy 注入)
- fixture は実機 capture をそのまま使い、手書き合成 payload を混ぜない(P2)

## 決定木(エラー経路)

- 未知イベント/未知 target → fail-open(exit 0、何もしない)
- core hook 不在(未インストールのプロジェクト) → fail-open
- core hook の異常終了 → Kimi の規約どおり fail-open(観測のみ)
- Stop の core 出力が壊れている場合 → block 契約を中継できないため exit 0 で fail-open(stderr に理由を出すが block はしない)。ループ enforcement が失われるだけで workflow を破壊しない(BR-3 の verbatim 中継は「整形された出力」にのみ適用)

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-25T11:24:14Z
- **Iteration:** 1
- **Scope decision:** none

dispatch フローは C2 インターフェースと整合し、live capture 手順は Q1/OC-1 境界を尊重して具体的。検出4件は全て minor で同一 iteration で修正済み。

### Findings

- (minor / BLM 決定木) fail-closed 相当の矛盾表現 → 修正済み(fail-open に統一)
- (minor / BR 突合注記) ぶら下がり参照 → 修正済み(7イベント/9target の突合を本文に明記)
- (minor / BLM state-sync) TaskUpdate 形状の無根拠契約化 → 修正済み(core hook 定義・capture 確認と明記)
- (minor / 上流参照) 本文参照不足 → 修正済み(適用範囲節を3ファイルに追記)
