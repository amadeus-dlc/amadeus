# Business Logic Model — U4 subagent-started

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md — U4 の責務は unit-of-work.md U4 行(按分195行: hook 100+registry pin 部 15+lifetime 80)から、API 形は component-methods.md の subagent-start hook / subagent-lifetime 節から、FR 契約は requirements.md FR-SUB-1〜3 から、価値は story-map 段4(未完了の機械検知)から。本 Unit は store を読む(lifetime 合成)が新 store を作らない — その境界は services.md に依拠する。

## PreToolUse hook(hooks/amadeus-subagent-start.ts 新設)

1. settings.json.example へ **PreToolUse セクションを新設**(matcher: `Task`)— 現状 PreToolUse セクション自体が不在(codekb 実測)。全ハーネス設定面+dist 再生成
2. hook 本体: readHookStdin → ClaudeCodeHookInput の tool_input から subagent_type / prompt を解決(payload に無ければ Agent Type = "unknown" へ正規化 — SubagentStop 側 normalizeAgentType の既習形)
3. **3段ゲート**(amadeus-log-subagent.ts:37-63 の既習形): TTY / shard 不在 / workflow 完了済 → 早期 exit
4. ensureOtelBootstrap → appendAuditEntryViaEvents("SUBAGENT_STARTED", { "Agent Type", "Agent ID"?, "Purpose"? }) → 失敗は recordHookDrop(fail-open)
5. Purpose = prompt の先頭1行を要約長へ切詰め(SubagentStop の Message 200字切詰めの既習形)

## lifetime 合成(FR-SUB-3 — 読取合成、実スパン非保持)

composeSubagentLifetimes(records): readJournalRecords 済みの記録列から SUBAGENT_STARTED/COMPLETED を抽出して突合する純関数(store 書込なし)。**決定的突合規則**:
1. Agent ID が両側に在る場合: ID 完全一致で突合(一意)
2. ID 欠落側がある場合: 同一 Agent Type の**未完了 started のうち startedAt が最も新しいもの**を貪欲に消費(LIFO 最近傍 — 同 Type 並列 fan-out で最後に起きた agent が先に終わる典型に合わせる)。同時刻同名は record 順(シャード内 seq 順)で先着消費
3. どの規則でも突合不能な completed は agentId null・startedAt 欠落の孤児として除外(合成対象外)、突合されない started は incomplete: true
テスト義務: 同一 Type 3並列(ID 有/無混在)・同時刻 tie-break・孤児 completed の3+ケース(business-rules BR-U4-3 に対応)。amadeus.subagent.duration 計器(U5)の導出元。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-01T03:37:40Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の Critical(ガード目録の10項目全数化+doc 同期タスク化)/ Major(lifetime 突合の決定的規則化)/ Minor 2件(エッジ表記・Purpose 仕様統一)を是正確認し READY。

### Findings

- None
