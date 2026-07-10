# Re-scan 記録 — 260710-mint-presence-vectors

> #707 契約(per-intent re-scan 記録)。差分ベース点の真実源はこのファイル(この intent 固有)。共有 `reverse-engineering-timestamp.md` は鮮度ポインタであってベース点ではない。

## スキャンメタデータ

- **base**: `584262c1a9b9d6beac11cb0b98d03f2fc001fba6`(タスク指定の前回 observed)
- **observed**: `fc5a34cf194aac05a4913e99eb7f9c4707d9d8e1`(`git rev-parse HEAD` 実測)
- **date**: 2026-07-10
- **intent**: `260710-mint-presence-vectors`(#755 — machine-injected-turn 分類器が `<task-notification>` 開頭しか抑止せず、teammate-message 注入ターン=agmsg/SendMessage inbox 配信が phantom HUMAN_TURN を鋳造し human-presence gate と #671 委任 provenance を汚染する)
- **scope**: bugfix
- **手法**: diff-refresh(project.md 是正 cid:reverse-engineering:c1)。フォーカス面は現行コード直読で file:line 確定。加えて **e1/e6 争点は動的実測で照合**(隔離 temp プロジェクトでの合成 stdin 測定 + 本番 Claude Code transcript の法医学的照合)。
- **監査汚染回避**: 動的測定は全て `mktemp -d`(scratchpad 配下)の隔離 temp プロジェクトで実施(`CLAUDE_PROJECT_DIR` を temp に固定)。実プロジェクト record への監査書き込みは一切行っていない。

## focus(スキャンスコープ)

- `packages/framework/core/hooks/amadeus-mint-presence.ts` — 分類器本体。`MACHINE_INJECTED_PROMPT_PREFIX = "<task-notification>"`(`:47`)、`isMachineInjectedTurn()`(`:51-66`)、判定は `prompt.startsWith(MACHINE_INJECTED_PROMPT_PREFIX)`(`:62`)、鋳造点 `appendAuditEntry("HUMAN_TURN", {}, projectDir)`(`:71`)。設計コメント `:9-19`(分類根拠)・`:25-27`(FAIL-OPEN)
- `packages/framework/core/hooks/amadeus-stop.ts` — tier-3 会話カーブアウト。`transcriptIsConversational()`(`:581-737`)、tier-3 判定 `isConversationalStop()`(`:743-758`)、除外ヘルパ `isInjectedHookFeedback()`(`:568-`、"Stop hook feedback:" のみ)
- `packages/framework/core/tools/amadeus-lib.ts` — presence gate 中核 `humanActedSinceGate(projectDir, verb?)`(`:1507-1545`)、`verifyDelegatedProvenance`(`:1547-`)
- `packages/framework/core/tools/amadeus-state.ts` — 消費側 `assertHumanPresentForGateResolution`(gate `:1456`)、委任発行 `handleDelegateApproval`(grounding `:1625`、issuer HUMAN_TURN 参照 `:1645`)、`handleDelegateRejection`(grounding `:1715`)
- `packages/framework/core/tools/amadeus-audit.ts` — HUMAN_TURN の CLI minting guard(`:753`/`:768`、presence 系は in-process writer のみ)
- `tests/unit/t203-mint-presence-classify.test.ts` — #708 分類契約 pin(form A 抑止 `:90-94`、人間鋳造 `:97-101`、FAIL-OPEN 3 ケース `:104-120`、PRIVACY `:123-129`、self-gate `:132-141`)
- `tests/unit/t188-human-presence-gate.test.ts` — gate 境界セマンティクス pin

## 差分の焦点影響(`584262c1a..fc5a34cf1`)

- `git diff --name-status 584262c1a..fc5a34cf1 -- ':!amadeus/' ':!dist/'` の実体は **空**。base→HEAD の間に `amadeus/`(record/codekb/state)と `dist/` 以外のソース変更は無い。
- **フォーカス面への影響: 無**。`amadeus-mint-presence.ts` / `amadeus-stop.ts` / `amadeus-lib.ts` / `amadeus-state.ts` は base の RE スキャン時点と**バイト同一**。以下の所見は現 HEAD コード直読と本 intent 用の実測に基づく。

---

## e1/e6 争点の照合結論(本 intent の中心成果)

### 争点

- **e1**(1人目レビュー): 形式 B(`[SYSTEM NOTIFICATION - NOT USER INPUT]` 前置き + `<task-notification>`)**も鋳造される**。
- **e6**(訂正): 形式 B(task-notification 系)は分類器が**正しく抑止**。確定ベクタは形式 D(teammate-message、`Another Claude session sent a message:` 開頭)のみ。

### 測定(1): 合成 stdin(隔離 temp プロジェクト、shipped hook を stdin 投入)

各ケースで temp record の audit shard の `HUMAN_TURN` 行数を実測(exit code は全ケース 0)。

| ケース | prompt 開頭 | `startsWith("<task-notification>")` | 鋳造 HUMAN_TURN | 判定 |
|---|---|---|---|---|
| A | `<task-notification>…`(裸) | true | **0** | 抑止(正) |
| B | `[SYSTEM NOTIFICATION - NOT USER INPUT]\n<task-notification>…` | false | **1** | 鋳造 |
| C | `hello`(人間対照) | false | **1** | 鋳造(正) |
| D | `Another Claude session sent a message:\n…` | false | **1** | 鋳造 |

合成レベルの事実: **B・C・D はいずれも鋳造する**(startsWith は先頭バイトのみ照合し、任意の前置きで失敗する)。この限りでは **e1 の「形式 B も鋳造」は正しい**。

### 測定(2): 本番 transcript の法医学的照合(読み取りのみ)

`prompt` フィールドの実体は audit shard に記録されない(PRIVACY 設計 `:21-23`)。そのため「hook が実際に受け取る prompt 形式」は本番 Claude Code transcript(`~/.claude/projects/**/*.jsonl`)の user-role メッセージ本文で確定した。amadeus agent-team の実セッション 2 本を対象:

| transcript | 形式 A 裸 `<task-notification>`(抑止) | 形式 B `[SYSTEM NOTIFICATION` 前置き | 形式 D `Another Claude session sent a message:`(鋳造) |
|---|---|---|---|
| worktree-engineer3 | 187 | **0** | 11 |
| worktree-engineer2 | 252 | **0** | 7 |
| 合計 | **439** | **0** | **18** |

- 本番の monitor task-notification は **439/439 が裸の形式 A** で配信され、`[SYSTEM NOTIFICATION - NOT USER INPUT]` 前置きは **amadeus transcript に 1 件も存在しない**。当該前置き文字列はレポジトリコードにも存在せず(`grep` ヒットは本 intent の #755 バグ記述のみ)、別ハーネス(ai-tools/takt 系)transcript にのみ現れる外来アーティファクトで、しかも user-role text ブロックとしては表出しない。
- teammate-message は **形式 D**(user-role ターンとして `Another Claude session sent a message:` 開頭)で配信され、分類器を素通りして鋳造する。本番 2 セッションで計 18 件の実注入を確認。
- 鋳造密度の傍証: leader セッション shard `260709-framework-repair-batch/…-8ae8f850c7a1.md` は約21時間(07:05Z→翌03:49Z)で **HUMAN_TURN 352 行**。もし裸 task-notification が抑止されていなければ monitor ケイデンス(本番 transcript で数百件規模)で桁違いに膨張するはずだが、そうなっていない — 形式 A が実際に抑止されている挙動と整合する。残余の phantom 鋳造は形式 D(teammate-message)+ 実人間ターンで説明できる。
- 当セッション(claude-engineer-4、clone `43f1446de338`)の当 intent shard は 03:56Z 開始の機械駆動 conductor で state 既存のため HUMAN_TURN=0。タスク前提の「01:00-01:07 の注入密度」は当 clone の on-disk shard には該当イベントが無く、上記 leader shard 群が phantom 鋳造の実証拠となる。

### 確定結論

**「hook が実際に受け取る prompt」に対しては e6 が正しい。**

1. **形式 A(裸 task-notification)は本番実配信形式であり、正しく抑止される**(439/439、t203:90-94 の pin と一致)。e6 の「B(task-notification 系)は抑止」は、production の task-notification が実際には形式 A で届く、という趣旨で正しい。
2. **確定ベクタは形式 D(teammate-message)**。分類器は先頭 `<task-notification>` のみを見るため、`Another Claude session sent a message:` 開頭の agmsg/SendMessage inbox 配信は素通りして phantom HUMAN_TURN を鋳造する。これが #755 の実害源(本番 18 件実測)。
3. **e1 の「形式 B も鋳造」は合成のみ真、本番では非該当**。startsWith が任意前置きで失敗する以上、preamble 付きペイロードを投入すれば確かに鋳造する(測定(1)で HUMAN_TURN=1)。しかし amadeus 本番の monitor 注入は preamble を prompt フィールドに含めない(0/439)。e1 は構築ペイロード B を試験したもので、production の注入形式ではない。

**合成 B と実運用 B の食い違いの理由**: `[SYSTEM NOTIFICATION - NOT USER INPUT]` 前置きは amadeus の monitor/agmsg 注入の prompt フィールドに含まれない。Claude Code の monitor は marker `<task-notification>` を prompt の**先頭バイト**として配信する(hook `:46` の "Measured live (#708)" と実測 439 件が一致)。したがって e1 が観測した B の鋳造挙動は、hook の prompt フィールドに実際には現れない前置きを持つ人工ペイロードに対するもので、実運用の同種ターン(=裸 A)は抑止される。

**修正方針への含意**(所見のみ、修正はスコープ外): 分類は単一 marker の startsWith では不十分。実注入形式のカタログ(最低でも `<task-notification>`(A)と `Another Claude session sent a message:`(D))を網羅する必要がある。形式 B は本番非該当だが、marker を「先頭からの部分一致」でなく「注入シグネチャ集合」で判定すれば preamble 変種にも将来頑健。

---

## stop.ts tier-3 所見(`transcriptIsConversational`、leader 指摘の同カタログ不在)

- `transcriptIsConversational(transcriptPath, format)`(`:581-737`)は transcript の**終端ターンが会話的か**(engine 未関与の人間チャット)を分類し、tier-3 会話カーブアウト(Stop hook が再ナッジを抑える)の可否を決める。
- user-role ターンを「genuine human prompt」(`humanPrompt=true`)と数える条件(`:609-643`)は、除外リスト(`isMeta`(`:619`)・`tool_result` 配列(`:620-623`)・`isInjectedHookFeedback`(`:637`))を通過し content が文字列/text ブロックであること、のみ。
- **同カタログ不在の露出**: 除外ヘルパ `isInjectedHookFeedback`(`:568-`)は `"Stop hook feedback:"` 系の**自己注入**しか弾かない。**task-notification(A)も teammate-message(D)もここでは一切除外されない**。両形式とも文字列/text content を持ち `isMeta`/`tool_result`/hook-feedback のいずれでもないため、`humanPrompt=true` として「直近の genuine human prompt」に採用される(`:721-728`)。
- **mint hook より露出が大きい**: mint hook は少なくとも startsWith で形式 A を弾く。tie-3 には marker チェックが**全く無い**ため、A も D も素通りする。結果、終端が注入 task-notification / teammate-message で、その後に engine call が無い場合(`:731-736`)、`isConversationalStop` が true を返し(`:753`)、機械注入 ping を人間チャットとみなして会話カーブアウトを付与しうる。#755 の分類器欠陥と**同根**(注入ターンを人間ターンと誤認)であり、修正時は mint hook と共通の注入カタログを共有すべき。

## HUMAN_TURN 消費系への影響面(focus 5)

- `humanActedSinceGate(projectDir, verb?)`(`amadeus-lib.ts:1507-1545`): audit shard を走査し「直近の gate resolution より後に HUMAN_TURN(または検証済み委任)があるか」を判定(`:1544` の `lastHuman > lastResolution`)。**phantom HUMAN_TURN が gate 後に鋳造されると true に転じ、無人でゲート解決が通る**。
- 消費点: `assertHumanPresentForGateResolution`(`amadeus-state.ts:1456`)が approve/reject を gate。委任発行 `handleDelegateApproval` も自セッション presence を要求(`:1625`)。
- **委任 provenance 汚染(#671)**: `handleDelegateApproval` は DELEGATED_APPROVAL を「自 shard の HUMAN_TURN timestamp」で grounding する(`:1645` — `findAllEvents(..., "HUMAN_TURN")` の最終行を参照)。teammate-message(形式 D)由来の phantom HUMAN_TURN がこの grounding を満たしてしまうため、`verifyDelegatedProvenance` は on-disk に実在する(ただし phantom)HUMAN_TURN を根拠に委任を受理する。これが #755 が「#671 delegated-approval provenance を汚染」と述べる経路。
- CLI minting guard(`amadeus-audit.ts:753/768`)は「HUMAN_TURN を汎用 CLI で鋳造すること」を拒否するが、**UserPromptSubmit hook 自身の in-process 鋳造は正規経路**であり、分類漏れ(形式 D)による鋳造はこの guard を通り抜ける。guard は「模倣鋳造」を防ぐが「分類漏れ鋳造」は防げない。
- pin: t188(gate 境界)・t112(委任交差)・t203(分類契約)。t203 は現状 form A 抑止のみを pin し、**形式 D 抑止のテストは不在**(`grep "Another Claude session" tests/` ヒット 0)。#755 修正は t203 に form D の RED→GREEN ケース追加を要する。

## codekb 更新提案

- **更新要(2件)**:
  - `code-quality-assessment.md` — #755 観測面を追記(分類器の単一 marker startsWith 欠陥、形式 D 未捕捉、stop.ts tier-3 の同根露出、t203 のカバレッジ欠落)。
  - `architecture.md` — human-presence gate 機構節に「注入ターン分類は mint-presence と stop.ts tier-3 の 2 箇所に分散し、注入カタログが非共有(mint は A のみ、tier-3 は皆無)」という構造事実を追記。
- **温存(他成果物)**: `dependencies` / `code-structure` / `technology-stack` / `api-documentation` / `business-overview` / `component-inventory` は base→HEAD 無変更かつ本 intent 観測面と無関係のため温存(churn 回避、project.md cid:practices-discovery:c2 相当)。
- **鮮度ポインタ**: `reverse-engineering-timestamp.md` の observed を `fc5a34cf1` に更新。
