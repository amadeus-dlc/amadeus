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
compatibility: Requires bun and this repository checkout (scripts/amadeus-election.ts).
---

# amadeus-election — 指令転送ループ

## 起動

選挙定義 JSON(electionId・kind・question・choices・voters)を受け取り、次を実行する:

```
bun scripts/amadeus-election.ts open --file <definition.json>
```

exit 0 以外なら出力の error をそのまま人間へ提示して停止する。

## 転送

以下のループを繰り返す。**このスキルは次の一手を自分で決めない** — `next` の指令が名指しした verb と report を字義どおり実行するだけである:

```
bun scripts/amadeus-election.ts next --election <id>
```

1. 出力(stdout の JSON 1行)を読む。
2. `kind` が `done` ならループを終了する(→ 終了節)。
3. `kind` が `hold` なら人間委譲節へ移る。
4. `kind` が `collect-wait` なら、`pending` に列挙された投票者からの票を待つ。票が届いたら `vote --election <id> --file <ballot.json>` で受理し、ループ先頭へ戻る。受理が exit 1 なら error を投票者へそのまま返す。
5. それ以外は、指令の `verb` フィールドが名指しするサブコマンドを `--election <id>` 付きで実行し、続けて `report --election <id> --result <指令の report フィールド>` を実行してループ先頭へ戻る。いずれかが exit 0 以外なら停止して人間へ提示する。

補助照会はいつでも `status --election <id>` を使ってよい(読み取りのみ)。

## 人間委譲

`hold` 指令・エラー・およびあらゆる判断点は人間の裁定事項である。このスキルは解決を試みない:

- `hold` 指令の `reason` と、CLI が出力した選択肢をそのまま人間へ提示する。
- 単一提案型の hold は二値裁定、多肢 tie の hold は `choice:<internalNo>` を人間の裁定として使う。
- 人間が解決を告げたら `report --election <id> --result hold-resolved --resolution <人間の裁定>` を実行し、転送節のループへ戻る。
- 催促するかどうか・いつ開票するか等の裁量も人間へ委ねる(このスキルは待つだけである)。

## 終了

`done` 指令を受けたら、選挙記録のパス(elections ディレクトリ配下の record.md)を人間へ報告して終了する。記録の解釈・後続対応(persist、ノルム反映など)は人間の領分であり、このスキルは行わない。
