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
compatibility: Requires bun; the CLI is bundled at .kimi-code/tools/amadeus-election.ts.
---

# amadeus-election — 指令転送ループ

## 起動

選挙定義 JSON(electionId・kind・question・choices・voters)を受け取り、次を実行する:

```
bun .kimi-code/tools/amadeus-election.ts open --file <definition.json>
```

exit 0 以外なら出力の error をそのまま人間へ提示して停止する。

**ソロモード(subagent 投票者):** voters は `subagent-1` と `subagent-2` を指定する。conductor(main agent)は選挙管理委員として指令ループを駆動し、自らは投票しない。

**ソロ選挙の発動:** (a) 設計逸脱 (b) ブロッカー (c) §13 学習選定 の3類型で自動発動する。それ以外はユーザーが「選挙にかけて」と明示したときのみ発動する。仕様変更およびエスカレーション正準リスト事項は選挙対象外(ユーザー専権)とする。

**spawn 不能時:** Agent tool(spawn)が使えない環境では、選挙を開かず次の1行を stderr または会話へ出力してユーザー裁定へ切り替える: `spawn 不能のためユーザー裁定へ降格`

## 転送

以下のループを繰り返す。**このスキルは次の一手を自分で決めない** — `next` の指令が名指しした verb と report を字義どおり実行するだけである:

```
bun .kimi-code/tools/amadeus-election.ts next --election <id>
```

1. 出力(stdout の JSON 1行)を読む。
2. `kind` が `done` ならループを終了する(→ 終了節)。
3. `kind` が `hold` なら人間委譲節へ移る。
4. `kind` が `collect-wait` なら、`pending` に列挙された投票者からの票を待つ。票が届いたら `vote --election <id> --file <ballot.json>` で受理し、ループ先頭へ戻る。受理が exit 1 なら error を投票者へそのまま返す。
5. それ以外は、指令の `verb` フィールドが名指しするサブコマンドを `--election <id>` 付きで実行し、続けて `report --election <id> --result <指令の report フィールド>` を実行してループ先頭へ戻る。いずれかが exit 0 以外なら停止して人間へ提示する。

補助照会はいつでも `status --election <id>` を使ってよい(読み取りのみ)。

**ソロ distribute 時(notify が directive を返す):** 各 DeliveryDirective ごとに subagent を1体起動する。spawn プロンプトは次の3要素のみ — (1) `{electionId}` (2) `{viewPath}` (3) `spawnInstruction` を verbatim 転送(独自再構築しない)。main agent の分析・推奨・他 voter の存在状態は含めない。固定手順文を末尾に付ける:

```
手順: 配布ビューを読む → 独立に証拠を実測する → ballot JSON(voterKind: "subagent", voter: <指定名>)を作成する → vote verb を自分の Bash で実行する → 受理 JSON を確認してから完了報告する。投票完了までターンを終えない。
```

**票未着:** `status` の `pending` に残存する場合、同一 voter 名で subagent を再起動する(1回まで)。なお未着なら選挙は collecting のまま保存し、人間へエスカレーションする。

## 人間委譲

`hold` 指令・エラー・およびあらゆる判断点は人間の裁定事項である。このスキルは解決を試みない:

- `hold` 指令の `reason` と、CLI が出力した選択肢をそのまま人間へ提示する。
- 単一提案型の hold は二値裁定、多肢 tie の hold は `choice:<internalNo>` を人間の裁定として使う。
- `reason` が `split` の hold、棄権票を含む hold、ブロック hold は人間の裁定事項である。
- 人間が解決を告げたら `report --election <id> --result hold-resolved --resolution <人間の裁定>` を実行し、転送節のループへ戻る。
- 追加議論 hold の解決(discussed → collecting)後の再投票は、同一 subagent 個体を resume する。resume メッセージには相手票の留保・rationale を verbatim で添付し、amend ballot(同一 voter 名・既存 ref 契約)で再提出する。resume 不能時は新規 spawn で同一 voter 名を引き継ぎ、その旨を record に残す。再投票後も GoA 5 が残存する場合はユーザーへエスカレーションする(追加議論は1ラウンドのみ)。
- 催促するかどうか・いつ開票するか等の裁量も人間へ委ねる(このスキルは待つだけである)。

## 終了

`done` 指令を受けたら、選挙記録のパス(elections ディレクトリ配下の record.md)を人間へ報告して終了する。記録の解釈・後続対応(persist、ノルム反映など)は人間の領分であり、このスキルは行わない。
