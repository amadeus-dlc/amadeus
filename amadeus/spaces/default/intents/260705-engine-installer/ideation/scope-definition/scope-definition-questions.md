# Scope Definition 質問（260705-engine-installer）

上流入力: [intent-statement.md](../intent-capture/intent-statement.md)

スコープ境界は grilling 確定 1（配布単位 = フルセット、.agents/rules/ 除外）と Issue #451 受け入れ条件で確定済みである。回答は上流から転記し、新規のピア協議は行わない。

---

## Q1. 配布単位（スコープ内の範囲）はどれですか？

A. フルセット: エンジン `.agents/amadeus/` 一式（7 dir）+ amadeus* skills 2 系統 + `.claude/` symlink 配線 7 entry + settings.json の hooks 配線（マージ）+ AMADEUS.md。`.agents/rules/` は除外
B. エンジンだけ
C. フルセット + `.agents/rules/`
X. Other (please specify)

[Answer]: A（出典: grilling 確定 1）

## Q2. PR の分割はどうしますか？

A. 単一 PR（インストーラ + eval + README は受け入れ条件の検証上不可分）。Bolt 分割は delivery-planning で確定
B. インストーラと eval を別 PR
C. README を別 PR
X. Other (please specify)

[Answer]: A（出典: scope-document.md 段階分割。分割するとどの PR も単独で受け入れ条件 1〜4 を検証できない）
