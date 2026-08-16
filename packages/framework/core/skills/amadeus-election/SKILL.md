---
name: amadeus-election
description: >-
  Run a team election through the amadeus-election CLI's typed directive loop.
  Use when the user or team workflow asks to open, drive, or complete an
  election. The CLI is the single source of the election protocol: this skill
  only forwards what each directive names and hands every judgement point to a
  human. Do not use for ad-hoc polls outside the elections store, and do not
  answer election-procedure questions from this skill — the CLI's directives
  are the only procedure.
compatibility: Requires bun; the CLI is bundled at {{HARNESS_DIR}}/tools/amadeus-election.ts.
---

# amadeus-election — 指令転送ループ

## 起動

選挙定義 JSON を受け取る。定義は常に `schemaVersion: 2`・`electionId`・`kind`・`questions[]`・`voters` を持つ。単問は `questions[]` が1要素、複数問は複数要素で、各要素は `questionId`・`text`・`choices` を持つ。`choices[]` は `internalNo`・`label` に加えて任意の `description`(その選択肢の本文)を持てる。
`questions[].text` と `description` は投票者ごとの blind view にそのまま搬送されるため、選択肢に説明を要する選挙では `description` を付ける:

```bash
bun {{HARNESS_DIR}}/tools/amadeus-election.ts open --file <definition.json>
```

exit 0 以外なら出力の error をそのまま人間へ提示して停止する。

**票の形:** 票も常に `schemaVersion: 2` で、回答は `responses[]`(各要素は `questionId`・`choiceInternalNo`・`goa`・`reservation`・`rationale`)に入れる。単問の選挙でも要素1個の `responses[]` を使う。

**ソロモード(subagent 投票者):** voters は `subagent-1` と `subagent-2` を指定する。conductor(main agent)は選挙管理委員として指令ループを駆動し、自らは投票しない。

**ソロ選挙の発動:** 発動条件は設定項目ではなく Intent Autonomy Mode から導出する。`semi` / `full` は `auto`、`none` は `manual` を導出し(旧 `solo-election.trigger.mode` は廃止済み — 残置された旧キーは無視されず config 解決が loud fail する)、`auto` の場合に限り (a) 設計逸脱 (b) ブロッカー (c) §13 学習選定 の3類型を自動発動する。自動発動では `open` に `--trigger auto` を必ず付け、`{"opened":null,"reason":"solo-election-manual-trigger-required"}` が返ったら選挙を作成せずユーザー裁定へ切り替える。`manual` を導出する場合、および上記以外の類型では、ユーザーが「選挙にかけて」と明示したときだけ通常の `open` で発動する。仕様変更およびエスカレーション正準リスト事項は mode によらず選挙対象外(ユーザー専権)とする。

**spawn 不能時:** Agent tool(spawn)が使えない環境では、選挙を開かず次の1行を stderr または会話へ出力してユーザー裁定へ切り替える: `spawn 不能のためユーザー裁定へ降格`

## 転送

以下のループを繰り返す。**このスキルは次の一手を自分で決めない** — `next` の指令が名指しした verb と report を字義どおり実行するだけである。`targetQuestionIds`・`held`・`preservedResultDigest` を自分で選んだり作り直したりしない:

```bash
bun {{HARNESS_DIR}}/tools/amadeus-election.ts next --election <id>
```

1. 出力(stdout の JSON 1行)を読む。
2. `kind` が `done` ならループを終了する(→ 終了節)。
3. `kind` が `hold` なら、まず人間委譲節へ移る(再投票ラウンドを回すかどうかは人間が決める)。
4. `kind` が `collect-wait` なら、`pending` に列挙された投票者からの票を待つ。票が届いたら `vote --election <id> --file <ballot.json>` で受理し、ループ先頭へ戻る。受理が exit 1 なら error を投票者へそのまま返す。再実行中は `targetQuestionIds` に列挙された question だけを `responses[]` に含める。
5. それ以外は、stdout の指令 JSON をファイルへ保存し、指令の `verb` フィールドが名指しするサブコマンドと続く `report` の両方を `--election <id> --file <そのファイル>` 付きで実行する（指令を再構築しない）。いずれかが exit 0 以外なら停止して人間へ提示する。

人間が再投票を選んだ場合、`hold` 指令も他の指令と同じ転送に従う。これは mixed result のあと hold-only rerun を配る指令であり、`held` から対象をスキルが選ばない。

補助照会はいつでも `status --election <id>` を使ってよい(読み取りのみ)。

**ソロ distribute 時(notify が directive を返す):** 各 DeliveryDirective ごとに subagent を1体起動する。spawn プロンプトは次の3要素のみ — (1) `{electionId}` (2) `{viewPath}` (3) `spawnInstruction` を verbatim 転送(独自再構築しない)。main agent の分析・推奨・他 voter の存在状態は含めない。固定手順文を末尾に付ける:

```
手順: 配布ビューを読む → 独立に証拠を実測する → ballot JSON(voterKind: "subagent", voter: <指定名>)を作成する → vote verb を自分の Bash で実行する → 受理 JSON を確認してから完了報告する。投票完了までターンを終えない。
```

**票未着:** `status` の `pending` に残存する場合、同一 voter 名で subagent を再起動する(1回まで)。なお未着なら選挙は collecting のまま保存し、人間へエスカレーションする。

## 人間委譲

`hold` 指令・エラー・およびあらゆる判断点は人間の裁定事項である。このスキルは解決を試みない:

- `hold` 指令の `reason` と、CLI が出力した選択肢をそのまま人間へ提示する。`held[]` があるときは各 `questionId` と `reason` もそのまま提示する。
- `reason` が `tie` の hold・`reason` が `split` の hold、棄権票を含む hold、ブロック hold は人間の裁定事項である。CLI に人間の裁定を投入する verb は存在しないため、このスキルは裁定を CLI へ代理入力しない。
- 人間が「同じ問いを議論のうえ再投票する」と決めた場合にかぎり、`next` が返す hold 指令(`verb` が `notify`)を転送節どおりに実行し、`held[]` の question だけの再投票ラウンドを回す。人間が選挙外で決着させると決めた場合は、そこで選挙を止めて記録を残す。
- 追加議論を求める hold について人間が再投票を選んだ場合、同一 subagent 個体を resume する。resume メッセージには相手票の留保・rationale を verbatim で添付し、amend ballot(同一 voter 名・既存 ref 契約)で再提出する。resume 不能時は新規 spawn で同一 voter 名を引き継ぎ、その旨を record に残す。再投票後も GoA 5 が残存する場合はユーザーへエスカレーションする(追加議論は1ラウンドのみ)。
- 催促するかどうか・いつ開票するか等の裁量も人間へ委ねる(このスキルは待つだけである)。

## 終了

`done` 指令を受けたら、選挙記録のパス(elections ディレクトリ配下の record.md)を人間へ報告して終了する。記録の解釈・後続対応(persist、ノルム反映など)は人間の領分であり、このスキルは行わない。
