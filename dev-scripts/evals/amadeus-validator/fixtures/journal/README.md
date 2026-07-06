# journal — Intent 横断の調整記録（契約）

この文書は、`amadeus/spaces/<space>/journal/` の規約を定義する（Issue #557）。journal は memory（判断基準の正）でも knowledge（参照知識）でもない第三の置き場であり、Intent に紐づかない調整記録（ディスパッチ・調停・委任・体制変更・観察）の時系列生ログを扱う。

## ファイル規約

- journal/ 直下に置けるのは本 README.md と日次ファイル `<YYMMDD>.md` の 2 種のみ。
- 追記は常に当日ファイルの末尾へ行う（日次分割により並行 conflict の面が日単位で閉じる）。

## エントリ形式

各エントリは見出し 1 行 + 定型 4 フィールドで構成する。

```markdown
## HH:MM:SSZ <種別> — <要約>

- 発信者: <agmsg メンバー名または人間>
- 種別: <調停 | 委任 | 体制 | 観察>
- 本文: <整形済みの記録本文。複数行可>
- 昇格: -
```

- 見出しの時刻は UTC とする。
- 「昇格」フィールドは未昇格なら `-`、昇格時に journal-logger がスタンプ（`cid:<dirName>:<stage>:<cN>`（§13 persist 済み）または `PR #<n>`（steering 反映済み））を追記する。この追記だけが、記録済みエントリへの唯一の許容された変更である。

## 種別語彙と拡張手順

種別は次の 4 語彙とする: **調停 / 委任 / 体制 / 観察**。

語彙の追加は、本契約 doc のこの節の更新と同一 PR で行う（validator は本節の語彙表を検査基準にするため、語彙だけ先行して使うとエントリが検査に通らない）。

## 追記専用規律

- 記録済みエントリの本文・見出し・フィールドを書き換えない（audit と同じ規律。org.md）。
- 例外は「昇格」フィールドへのスタンプ追記のみ。
- 訂正が必要な場合は、新しいエントリで訂正内容を記録する（種別 = 観察、本文に訂正対象の見出しを明記）。

## 参照方向の規約

- **memory → journal**: steering の根拠表から journal エントリを実例として参照してよい（Issue / PR 参照と同格）。
- **journal → memory**: 網羅リンクは張らない。「昇格」フィールドのスタンプのみ（未昇格エントリの棚卸しを機械化するため）。
- **knowledge → journal**: 原則不要（代表例 1〜2 件の参照のみ許容）。
- 双方向の網羅リンクは禁止（維持コストがリンク切れ負債になる）。

## 書き込み機構と運用

書き込みは journal-logger（agmsg 専任メンバー、本 journal を単独所有する worktree で運用）が行う。任意のメンバーが agmsg でメッセージを送ると、logger が整形して追記し、ack（追記先ファイルと見出しアンカー + 仕分け提案を含む固定形式）を返す。仕分け（生ログ / learnings 候補 / steering 候補）は提案であり、memory / knowledge への定着は従来どおり §13 の human gate と steering 反映 Intent を通す（logger に定着決定権はない）。

- 起動・運用・日次 PR の手順: [knowledge/journal-logger-runbook.md](../knowledge/journal-logger-runbook.md)
- 運用検証チェックリスト: [knowledge/journal-logger-verification-checklist.md](../knowledge/journal-logger-verification-checklist.md)

## 検査

`amadeus-validator` が journal/ の構造（ファイル命名、必須フィールド、種別語彙）を検査する。journal/ は optional であり、未導入の workspace では検査は発動しない。
