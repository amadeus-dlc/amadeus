# Requirements Analysis Questions — 260706-harness-codex

## 上流入力

[intent-statement.md](../../ideation/intent-capture/intent-statement.md)、[scope-document.md](../../ideation/scope-definition/scope-document.md)、[team-practices.md](../practices-discovery/team-practices.md)、codekb（[business-overview.md](../../../../codekb/amadeus/business-overview.md)、[architecture.md](../../../../codekb/amadeus/architecture.md)、[code-structure.md](../../../../codekb/amadeus/code-structure.md)）。

要求の大枠はディスパッチ・設計確定（feasibility Q1〜Q6）・スコープ確定（scope-definition Q1〜Q2）で決着済み。decision-log の未決 2 件に対応する細部 2 問を自己判断（理由付き）で確定し、gate の人間承認で確定する。

## Q1. provenance の記録様式（decision-log 未決 1）

- A. 二重記録: source yaml 冒頭に YAML コメント（上流 path、基準 commit、写像、guard の意味の 3〜4 行）+ `harness/codex/provenance.md` に全件の写像表（上流 38 skill → amadeus skill の対応、取り込み判定）
- B. `harness/codex/provenance.md` の全件表のみ（yaml は上流内容そのまま）
- C. yaml コメントのみ（全件表なし）
- D. その他
- X. Other (please specify)

[Answer]: A（二重記録）。yaml 単体を開いた読者（promote 先を見る人を含む）と、全体を監査する読者（Phase 2 の build 化、純正性の再検証）の両方に導線が要る。ピア協議の付帯条件（leader / engineer5 = provenance を source 側と README 側の両方に）とも一致。写像表は provenance.md に置き、P1-2 の成果物を兼ねる。自己判断（理由付き）。

## Q2. harness/codex/ 文書の言語（decision-log 未決 2 の一部）

- A. 日本語（言語方針の英語必須対象 = SKILL.md / TS / docs/amadeus のいずれにも該当しない。repo の記述系既定に従う。Phase 2 で harness/ 層の位置づけが確定した時点で再判定）
- B. 英語（上流 harness/ が英語のため）
- C. 英語 + 日本語対訳
- D. その他
- X. Other (please specify)

[Answer]: A（日本語）。harness/codex/ の 2 文書は現時点では repo 内の契約・provenance 記録であり、配布に乗る knowledge/（英語慣行）とは層が異なる。skill-language-policy と docs/amadeus 言語方針の対象外であることを実測（両文書の対象定義）で確認済み。Phase 2 で dist 生成の source 層になる場合に言語を再判定する旨を README に明記する。自己判断（理由付き）。
