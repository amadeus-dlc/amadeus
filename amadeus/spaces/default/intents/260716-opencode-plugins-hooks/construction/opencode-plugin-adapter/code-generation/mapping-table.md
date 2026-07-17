# 写像対応表(工程0 成果物)— opencode-plugin-adapter(Issue #1049)

> 上流入力(consumes 全数): `../functional-design/business-logic-model.md`(ワークフロー1 工程0 手順)、`../functional-design/domain-entities.md`(Reconstruction 意図的相違・⚠ 参照)、`../functional-design/business-rules.md`(R-1〜R-8)、`../../../inception/application-design/decisions.md`(ADR-1〜5)、`../../../inception/requirements-analysis/requirements.md`(FR-1 AC-1a/1b/1c)。
>
> 測定方式: **型定義ベースの in-tree 再実測**(AC-1c 確定条件)。実 opencode ランタイムの起動やライブイベント捕捉は工程0 の対象外(prompt 工程0 = 「node_modules の実型定義からフック語彙・payload 構造を verbatim 採取」)。
> 測定 ref: worktree `bolt/1049-opencode-plugins`(HEAD = origin/main `d43ef459e`)へ `bun add -d @opencode-ai/plugin` で導入。**@opencode-ai/plugin@1.18.3**(依存 **@opencode-ai/sdk@1.18.3**)、bun 1.3.13、2026-07-17 測定(measurement-ref-in-artifacts)。
> 一次ソース(verbatim 引用元・当ツリー実ファイル):
> - `node_modules/@opencode-ai/plugin/dist/index.d.ts`(`Hooks` interface :173-322)
> - `node_modules/@opencode-ai/sdk/dist/gen/types.gen.d.ts`(`UserMessage` :39-60 / `Part`・`TextPart` :142-157,345 / `Event` union :602 / `EventXxx` variants / `ToolIds` :1215)

## 結論サマリ(3値 行数内訳)

| 分類 | 行数 | Cursor target |
|---|---|---|
| **配線(wired)** | **0** | (なし) |
| **⚠ 条件付き(conditional)** | **5** | audit-and-sensors / runtime-compile / session-start / session-end / validate-state |
| **未対応(unsupported)** | **3** | mint / log-subagent / stop |

**型定義ベースの工程0 では、Cursor 8 target のいずれも「配線(wired)」へ確定できない。** 主因は2系統:

1. **tool 系(audit-and-sensors / runtime-compile)**: seam と payload エンベロープ(`{ tool, sessionID, callID, args }`)は in-tree 実測で確定(index.d.ts:249-258 — AC-1c 外部実測と verbatim 一致)。しかし二段写像の入力である **tool 語彙**(`ToolIds = Array<string>` — enum なし、types.gen.d.ts:1215)と **args サブ構造**(`args: any` — index.d.ts:254)が型面で未確定。AC-2d / R-2 / E-OC9(external-seam-vocab-measurement)により、**語彙未実測のまま ToolNameMap へ登録・✅ 確約は禁止** → ⚠ 降格。確定条件 = 実 opencode ランタイムでの tool 語彙・args キー集合のライブ実測(型面に不在)。
2. **session/lifecycle 系(session-start / session-end / validate-state / stop)**: opencode の `event` フック(index.d.ts:175-177)経由で該当ライフサイクルイベントを観測できるが、(a) Cursor の意味論(session-start = コンテキスト注入、validate-state = preCompact、stop = ターン終了ゲート)と opencode イベントの**発火時機・意味が一致しない**、または (b) 副作用のみ配線(audit イベント発火)は可能だが「どのイベントを採るか・意味論不一致を許容するか」が**設計判断**であり実装者単独決定を禁ずる(deviation-applicability-not-solo / P1)。

**FR-1 AC-1a/1b/1c 充足**: 全 8 行を「配線根拠 or 反証可能根拠」で埋め、⚠ 行は確定条件を明記(空欄・推測 ✅ ゼロ)。**配線 0 件は受け入れ境界内の正常系**(scope-document / AC-5b / ADR-2 Consequences「配線数は実測結果に従属(0 も許容)」)。

---

## 対応表(Cursor 8 target × opencode Hooks)

| # | Cursor target(reconstruct case) | core hook が読む入力 | opencode 候補 seam(一次ソース verbatim) | status | 根拠 / 確定条件 |
|---|---|---|---|---|---|
| 1 | **session-start** | `source`(startup/resume/clear/compact)+ **stdout `{additionalContext}` を注入**(session-start.ts:231-233、cursor `forwardStdout:true`) | `event` フック + `EventSessionCreated`(`type:"session.created"`, `properties.info: Session` — types.gen.d.ts:493-498) | ⚠ | seam 実測済み・`Session.id` 取得可。だが **(a) `source` フィールドが opencode イベントに無い**(常に "startup" へ既定 → SESSION_RESUMED を出せない)、**(b) additionalContext 注入の seam が opencode に存在しない**(`event` は `Promise<void>` を返し出力注入不可 — index.d.ts:175-177。注入形の seam は experimental の `experimental.chat.system.transform` :265-270 のみ)。**副作用のみ(SESSION_STARTED audit)配線は可能**だが採否は設計判断。確定条件 = 副作用のみ配線を可とするか+session.created を session-start と見なすか(意味論裁定) |
| 2 | **mint**(HUMAN_TURN) | `prompt` テキスト(core が machine 注入マーカーで分類、mint-presence.ts:65) | `chat.message` フック(input `{sessionID,agent?,model?,messageID?,variant?}`, output `{message: UserMessage, parts: Part[]}` — index.d.ts:187-199) | **未対応** | **ADR-5 の2条件がいずれも型面で不成立(fail-closed)**: (i) `UserMessage`(types.gen.d.ts:39-60)に **machine 注入判別フィールドが無い**(id/sessionID/role/time/summary?/agent/model/system?/tools? のみ)。core の分類は prompt テキスト内の Claude Code 固有マーカー(`<task-notification>` / `<teammate-message` 等 — amadeus-lib.ts:337-342)依存で、core は **fail-open(分類不能なら mint)**。opencode の machine 注入ターン(存在有無すら不明)が同一マーカーを持つ保証なし → phantom HUMAN_TURN リスク。(ii) **AskUserQuestion 応答が chat.message を経由するかは型面で判定不能**(ランタイム挙動)。AC-3c / R-5 により **mint 配線を見送り**、human-presence は現行 delegate 運用(#671)を維持(退行ではない — opencode は現状 hooks なし運用) |
| 3 | **runtime-compile** | `tool_input.command`(runtime-compile.ts:59) | `tool.execute.after`(input `{tool, sessionID, callID, args: any}` — index.d.ts:249-258) | ⚠ | seam+エンベロープ実測済み(AC-1c 一致)。だが **shell/bash tool の語彙値**(`ToolIds = Array<string>`, enum 不在 :1215)と **`args` 内の command キー**(`args: any` :254)が型面で未確定。AC-2d により ToolNameMap 登録不可。確定条件 = ライブ実 tool.execute.after の tool 文字列(bash 相当)と args.command キーの実測。※ `EventCommandExecuted`(:456-464)は**スラッシュコマンド**(name/arguments/messageID)で shell 実行ではない — 誤採用禁止 |
| 4 | **audit-and-sensors** | `tool_input.file_path`(audit-logger.ts:46, sensor-fire.ts:76)、`tool_name`(audit-logger.ts:45 の CREATE/UPDATE 判定のみ。sensor-fire は tool_name 不参照 :60-61) | (A) `tool.execute.after`(:249-258)/ (B) `event` + `EventFileEdited`(`type:"file.edited"`, `properties.file: string` — types.gen.d.ts:425-430) | ⚠ | **(A)** は #3 と同根で ⚠(語彙+args:any 未確定)。**(B) は `properties.file` が型付き string で実測済み** — file_path を型面で確定できる**唯一の経路**。ただし (B) は設計指定 seam(tool.execute.after — AC-1c/scan-notes)からの**代替 seam への逸脱**であり、file.edited はファイルウォッチャ由来で tool 実行に限定されない(意味が広い)・自己書き込み再帰(guard 有: audit-logger.ts:62-68 / sensor-fire `.amadeus-sensors/`)を持つ。**seam 代替は設計判断**(P1 / deviation-applicability-not-solo)→ 実装者単独決定を禁じ報告。確定条件 = (A) ライブ語彙実測 or (B) file.edited 代替 seam の設計承認 |
| 5 | **log-subagent** | `agent_type` / `agent_id`(log-subagent.ts:44-45) | (なし) | **未対応** | opencode の `Hooks`・`Event` union(:602)に **subagent 停止 + agent 種別/ID を運ぶイベントが無い**。sub-session は `Session.parentID`(types.gen.d.ts:469)で表現されるが、「subagent が停止した」+ agent identity を通知する seam は不在。反証可能根拠 = Event union 全 31 種の grep に該当なし。将来 opencode が subagent-stop イベントを追加した場合に再評価 |
| 6 | **validate-state** | stdin フィールド読まず(PreCompact、SESSION_COMPACTED 発火) | `event` + `EventSessionCompacted`(`type:"session.compacted"` — types.gen.d.ts:419-424) | ⚠ | seam 実測済み・入力フィールド不要。だが Cursor は **preCompact(圧縮前)** に配線、opencode の `session.compacted` は **圧縮後**発火 — **時機が逆**。core validate-state の PreCompact 検証(圧縮前状態の妥当性確認)を圧縮後に走らせる意味論不一致。確定条件 = 圧縮後発火で validate-state 意味論が成立するかの裁定(圧縮前フックが opencode に不在) |
| 7 | **session-end** | `reason`(session-end.ts:39-40、既定 "unknown") | (A) `event` + `EventSessionDeleted`(`type:"session.deleted"` :505-510)/ (B) `dispose` フック(index.d.ts:174) | ⚠ | seam 実測済み。だが **(A) session.deleted はセッション削除**でありセッション終了と意味が異なる、**(B) dispose はプラグイン破棄(opencode シャットダウン)** でセッション単位でない。いずれも `reason` を運ばず "unknown" 既定。副作用(SESSION_ENDED audit)配線は可能だが seam 選定+意味論裁定が設計判断。確定条件 = どちらの seam をセッション終了と見なすか |
| 8 | **stop** | latch/command 消費の複雑ゲート(stop.ts、advisory・exit 2 非発火) | `event` + `EventSessionIdle`(`type:"session.idle"` — types.gen.d.ts:413-418) | **未対応** | opencode に **ターン終了ゲートに相当するフックが無い**。`session.idle` はセッションのアイドル遷移でありターン境界のゲートではない(core stop の workflow-incomplete guard の発火点と一致しない)。ADR-3 により stop は advisory 固定でブロック機能を持たない前提だが、そもそも **stop 相当のイベント seam が意味論的に不在**。反証可能根拠 = Event union にターン終了/停止ゲートイベントなし。Cursor 側も stop は「block 契約未検証で advisory 降格」(cursor-lib.ts:186-195)であり、opencode でも配線見送りが整合 |

---

## FD 留保の確認結果(session 系のコンテキスト注入 seam)

**留保**(domain-entities.md `Reconstruction` 行 ⚠ / prompt 契約9 / 工程0 指示): 「session 系配線が cursor `forwardStdout` 相当のコンテキスト注入 seam を必要とするか実測し、必要と確定なら実装を止めて報告(型再設計トリガー)」。

**実測結論**:
- session-start の設計上の主目的は stdout `{additionalContext}` によるコンテキスト注入(session-start.ts:231-233)。Cursor は `forwardStdout:true` で配送。
- opencode の `Hooks` interface に **session-start コンテキストを注入する非 experimental seam は存在しない**。`event` フックは `Promise<void>` を返し出力注入不可(index.d.ts:175-177)。注入形の seam は experimental の `experimental.chat.system.transform`(input, output `{system: string[]}` :265-270)のみ — per-chat・experimental で session-start とは異なる。
- **型再設計トリガー該当性**: **非該当**。設計(domain-entities.md)は既に `forwardStdout` を採らないと裁定済み(ADR-3: 返り値で opencode の動作を変更しない)。session-start を**副作用のみ**(SESSION_STARTED audit)配線するなら現行 `Reconstruction = { calls: CoreCall[] }`(forwardStdout なし)で**充足** → **型再設計は不要**。コンテキスト注入を opencode で実現したい場合のみ experimental seam + 型拡張が必要だが、それは設計が明示 scope-out した範囲。
- **報告事項**: 注入 seam は opencode に(experimental を除き)**不在**。設計の scope-out は正しく、`Reconstruction` 型は現状のまま据え置き。experimental seam は将来オプションとして記録するが再設計は発火しない。

---

## 停止・報告事項(minimal shell の実装可否)

型定義ベース工程0 の結果、**firmly-WIRED = 0 件**。prompt 統制「配線 0 件という実測結果も正常系 — その場合は表+docs 更新(+plugin 最小殻を実装するか否かは停止して報告)」および P1/deviation-applicability-not-solo により、以下を**実装せず停止し報告**する:

1. **plugin 最小殻(entrypoint + lib + テスト + manifest 配線)を実装するか否か** — 配線 0 のため殻は no-op hooks のみになる。
2. **⚠ 5 行のうち副作用のみ配線を採るか**(session-start/session-end via event、audit-and-sensors via file.edited 代替 seam、validate-state via session.compacted)— いずれも意味論裁定を要する設計判断。
3. **tool 系 ⚠ を配線へ昇格するためのライブ opencode ランタイム実測**(tool 語彙・args キー)を工程0 スコープへ追加するか。

いずれも承認済み契約の範囲を超える設計判断のため、選挙/leader 裁定を仰ぐ。
