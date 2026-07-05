# Functional Design 質問 — unit: skill-quality-repair

requirements.md の「未確定事項」3 点と、実行単位の確認 1 点である。
Construction では質問は例外扱いのため、requirements で設計段階へ先送りした論点だけを扱う。

---

## Q1. 監査記録（R001）の成果物形式と置き場所

- A. Intent record 配下（`construction/skill-quality-repair/audit-report.md` 相当）に、skill ごとの判定表として置く。#340 には要約とリンクをコメントする（推奨）
- B. `docs/amadeus/` 配下の恒久文書として置く
- C. GitHub Issue #340 のコメントだけに記録する
- D. Intent record と恒久文書の両方に置く
- X. Other (please specify)

[Answer]: A

---

## Q2. #252 の検証の形式（R005）

- A. 決定論的検査（対象 skill の SKILL.md に入力契約の記載が存在することを検査するスクリプト）に加えて、references に検証手順を記載する（推奨）
- B. LLM を使う eval（実際に `#nnn` 入力を与えて挙動を確認する）を作る
- C. 手順書（マニュアル検証手順）だけにする
- D. 既存の検証群（parity、promote テストなど）への追加だけにする
- X. Other (please specify)

[Answer]: A

---

## Q3. Grilling Decision Trail 規約の表現形式（R004）

- A. テンプレート（コピーして埋める形式）と必須項目の生成規約記述の両方を amadeus-grilling の references に置く（推奨）
- B. テンプレートだけを置く
- C. 生成規約の記述だけを置く
- D. validator の検査コードにコメントとして書く
- X. Other (please specify)

[Answer]: A

---

## Q4. Construction の実行単位と PR 分割

3 Issue はすべて skill 変更である（team.md の粒度制約上、同種）。

- A. 単一 unit・単一 Bolt で実施し、PR は 1 個にまとめる（推奨）
- B. Issue ごとに 3 Bolt / 3 PR に分割する
- C. #340 の監査・補修を 1 PR、#405 と #252 の契約追記を 1 PR の 2 分割にする
- X. Other (please specify)

[Answer]: A
