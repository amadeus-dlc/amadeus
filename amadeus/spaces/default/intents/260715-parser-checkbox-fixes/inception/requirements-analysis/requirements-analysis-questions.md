# Requirements Analysis — 明確化質問(parser-checkbox-fixes)

intent: `260715-parser-checkbox-fixes`(Issue #1013 / #1015 修正バッチ、bugfix スコープ)
起草: 2026-07-16 / conductor e4(amadeus-product-agent ペルソナ)

> **選挙不要判定+選挙対象の申告(E-OC1 3段順序、[Answer] は裁定/承認後にのみ記入)**: 起草時の既決照合の結果、真に未決のユーザー可視契約は **Q1 の1問のみ**(Issue #1013 本文が期待挙動 (a)/(b) を「実装時に確定」と明示留保 — 既決・実測に帰着しない)。以下は既決・実測接地により選挙不要と判定:
>
> 根拠種別(1問1行):
> - #1015 の6状態保存+`CHECKBOX_MAP` からの導出+再構築ヘッダの6状態統一 = 既決(construction ガードレール「複数箇所で消費される定数は canonical な1定義から導出」+Issue #1015 期待挙動+タスク割当指示。RE scan-notes の対称性契約に接地)
> - #1013 の受理文法 = 実測接地(stage 契約 `practices-discovery.md:101`「`ALWAYS …` format / `NEVER …` format、One rule per line」+ t75 fixture の素形 `ALWAYS use Result<T,E> …`(tests/integration/t75.test.ts:170-176)+ `appendUnderHeading` の verbatim 挿入(amadeus-lib.ts:5263-5286)。先頭の任意 `- ` は既存 memory 層の手書き様式(`- NEVER …`)との整合のため許容し、除去後に節別キーワード(Mandated=`ALWAYS `/Forbidden=`NEVER `)で検証)
> - 落ちる実証・Issue 再現手順の verbatim 閉包・push 前 lcov・deslop・同根棚卸し = 既決(Mandated/team.md 品質契約)

## Q1. #1013 の契約違反行の fail 形はどちらにするか?(ユーザー可視契約)

対象: Issue #1013 期待挙動の (a)/(b) 選択。`practices-promote` の draft(discovered-rules.md)の `## Mandated`/`## Forbidden` 配下に、契約プレフィックス(節別 `ALWAYS `/`NEVER `、先頭 `- ` 任意)を持たない非空・非コメント・非見出し行が存在した場合の挙動。

- A. **全面 fail-closed(アトミック reject)**: 違反行が1行でもあれば promote 全体を失敗させる — `PRACTICES_OVERRIDE` audit を emit し exit 非0、**project.md / team.md には一切書き込まない**(違反行の一覧を行内容付きでエラー出力)。typo・散文の混入は運用者が draft を直してから再実行する。Issue 起票者見解 (a)(検証劇場 Forbidden の fail-open 禁止と整合、E-CS1 Q3 の全面 fail-closed 裁定と同方向)
- B. **行単位 skip+警告**: 契約適合行のみ append し、違反行は stderr 警告(行内容付き)を出して書き込まない — exit 0 で promote 自体は成功。draft の軽微な散文混入で practices ゲート全体が止まらない運用継続性を優先(黙殺ではないが、警告の見落としで違反行が「静かに欠落」するリスクが残る)
- X. Other(具体案を明記)

[Answer]: A(E-PB2 裁定 2026-07-16、4票中3票時点確定・全会一致方向・留保なし — アトミック reject+PRACTICES_OVERRIDE exit 非0+違反行一覧 loud 出力、既存 fail() 経路 :2478-2489 の再利用を推奨。agmsg 出典: 開票 22:47:14Z / git 検証: leader delegate シャード)
