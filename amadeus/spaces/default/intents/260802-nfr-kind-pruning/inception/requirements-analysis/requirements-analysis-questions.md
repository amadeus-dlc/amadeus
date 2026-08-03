# Requirements Analysis Questions

leader 承認 2026-08-03T00:18:35Z（対話応答）

## 判断根拠

- [Issue #2019](https://github.com/amadeus-dlc/amadeus/issues/2019) は、`kind=library` の NFR Requirements を5成果物から2成果物へ削減し、NFR Design も5成果物から2成果物へ削減することを目標とする。
- `business-overview.md`、`architecture.md`、`code-structure.md` と upstream commit `831bd29c392eff141a230e1e0501239eae132c31` を照合した。
- 現行 `nfr-design` は5つの NFR Requirements 成果物をすべて `required: true` と宣言する一方、engine の consume 解決は Unit kind を考慮しない。そのため library Unit で省かれる3成果物を「予期しない欠落」と判定する。
- この `self-fix` では `intent-statement`、`scope-document`、`team-practices` は個別成果物として生成されていない。ユーザー意図は Issue #2019、監査ログ、適用中の org/team/project 規則から取得した。

## Q1. library Unit で省かれた NFR Requirements を、NFR Design の必須入力判定からどう除外しますか？

A. Producer の既存 `produces_kinds` を consume 側にも投影する — applicability の正本を増やさず、library では省かれた3入力を欠落扱いしない。service では従来どおり5入力を必須にする
B. engine は変更せず、NFR Design の3入力を全 Unit で optional にする — 実装は小さいが、service Unit の必須入力契約も弱くなる
C. engine は変更せず、producer の `kind` 必須化だけ行う — NFR Requirements の間引きは発火するが、NFR Design が欠落入力を報告するため end-to-end の片翼移植は未完了になる
X. Other（自由記述）

[Answer]: A — Producer の既存 `produces_kinds` を consume 側にも投影する

## Q2. 要件生成前の決定サマリーは正しいですか？

A. Confirm — この内容で要件を生成する
B. Request changes — 決定内容を修正する
X. Other（自由記述）

[Answer]: A — Confirm

## Q3. 次回へ残す学びを選んでください（複数選択可）

A. Keep none — 今回固有の要件判断としてmemory.mdとrequirements.mdにのみ残す
B. upstream optional／新規producer required／legacy fallbackの境界をproject ruleへ保存する
C. mixed recordではkindless Unitだけ、不正集合では全Unitをfull matrixへ戻す粒度をproject ruleへ保存する
D. producerの`produces_kinds`をconsume側へ投影するseam対称性をproject ruleへ保存する
E. required consumeの一括optional化でservice契約を弱めない判断をproject ruleへ保存する
F. wall-clock効果仮説を固定gateにせず決定的proxyで合否判定する規律をproject ruleへ保存する
X. Other（自由記述）

[Answer]: A — Keep none

## Q4. 次回のために追加しておくことはありますか？

自由記述。追加がなければ「なし」と回答してください。

[Answer]: なし
