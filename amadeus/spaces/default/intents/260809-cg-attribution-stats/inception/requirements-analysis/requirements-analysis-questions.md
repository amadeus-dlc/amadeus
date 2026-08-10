# Requirements Analysis Questions — CG 観測可能区間と帰属不能残余

## E-OC1判定

`intent-statement.md` と `scope-document.md` は Issue #2695 の完了条件1〜10を縮小せず扱うと明示し、`business-overview.md`、`architecture.md`、`code-structure.md` の Reverse Engineering 断面が実装面、候補event、未決の設計論点を特定している。`team.md` のteam-practicesとorg/project rulesにも、この境界と矛盾する規則はない。

Issue本文から直接導出できるintent一致とmeasured population非退行は質問にしない。一方、複数欠陥を持つcandidateをどのprimary rejection reasonへ計上するかは3形式の公開値を変えるmaterial decisionであり、Product Lead review iteration 1を受けて1問だけ裁定する。

## 六次元完全性

| 次元 | 確定済みの根拠 | 判定 |
|---|---|---|
| Functional requirements | `scope-document.md` CAP-01〜CAP-10、population / event / interval / CLI / output / verification 契約。Q1でprimary reason precedenceを固定 | Q1回答後に完全 |
| Non-functional requirements | 会計恒等式、determinism、fail-closed、read-only、3形式 pipe 完全性、後方互換性 | 完全 |
| User scenarios | メンテナーの再実行、機械consumer、空母集団、不正argv、欠落・重複lifecycle、oversized output | 完全 |
| Business context | 追加計装への投資判断に使い、帰属不能残余を意味カテゴリへ推定配分しない | 完全 |
| Technical context | Bun/TypeScript、raw normalized journal、既存eventのみ、runtime containment推定禁止、既存renderer維持 | 完全 |
| Quality attributes | 合成・実corpus、PBT、semantic parity、digest parity、有限値、既存focused tests非退行 | 完全 |

## Q1. 複数欠陥candidateのprimary rejection reason precedence

同じcandidateにmalformed payload、intent/stage欠落、duplicate lifecycle、terminal欠落などが同時成立するとき、全formatで件数を一致させるためのprimary reason規則をどれにしますか。

A. `decode → intent → stage → identity → cardinality → completeness → temporal → normalization` の固定precedenceで1 primary reasonを選び、他の検出事項はsecondary diagnosticsに分離する（推奨）
B. lifecycle completeness（missing start/terminal）を最優先し、envelope/stage欠陥を後順位にする
C. primary reasonを置かず、成立した全reasonへ同じcandidateを重複計上する
D. audit rowの到着順で最初に検出したreasonをprimaryにする
E. familyごとに異なるprecedenceを定義し、共通順序を持たない
X. Other (please specify)

[Answer]: A — 固定precedenceで1 primary reasonを選び、他の検出事項はsecondary diagnosticsへ分離する（E-AUTO-RA-2695-Q1; AUTO_DECIDED `auto-decision-93c47474b7f6c5984f7b6d045ae16a62`）

## 後続stageへ送る設計論点

- 選択されたprimary reason precedenceをcandidate decoderのclosed vocabularyへ落とす。
- `stage-stats`単一ファイルの肥大化を避けるmodule seamはApplication Designで決める。
