# Requirements Analysis 質問

Intent: 260703-skill-quality-repair（amadeus skill 品質一括補修）
対象 Issue: #340（skill-forge 観点監査・補修）、#405（Grilling Decision Trail 生成規約）、#252（GitHub Issue 短縮参照標準化）

各質問の `[Answer]:` に選択肢の記号（複数可の場合はカンマ区切り）または自由記述を記入する。

---

## Q1. #340 の監査で適用する skill-forge の観点

skill-forge には多数のチェック観点がある。Amadeus 内部 skill の監査にどこまで適用するか。

- A. skill-forge の全チェック項目を適用する
- B. 4 観点に絞る: (1) description と trigger の品質、(2) SKILL.md と references の構造分割、(3) Skill Language Policy 適合（残日本語 3 件の判定を含む）、(4) 記載コマンド・パスの実行可能性（推奨）
- C. 言語 policy 適合と trigger 品質だけの最小監査にする
- D. 先に監査 rubric を成果物として確定し、rubric 自体を人間承認してから監査する
- E. skill ごとに監査観点を都度判断する
- X. Other (please specify)

[Answer]: B

---

## Q2. #340 の監査対象範囲

ステージ skill（38 個）は上流 awslabs/aidlc-workflows の適応コピーであり、適応点は「改名と grilling 結線」に限定する契約（parity:check で検査）がある。ステージ skill 本文の修正は parity 契約と衝突しうる。

- A. 公開入口（amadeus）、補助入口（amadeus-grilling、amadeus-domain-modeling、amadeus-validator）、その他非ステージ skill（init、outcomes-pack、replay、session-cost など）を修正対象とし、ステージ skill は「監査して問題を記録するだけ（修正は parity 契約の範囲内に限定）」とする（推奨）
- B. skills/amadeus*/ 全 skill を監査・修正の対象にする（parity 逸脱が必要なら契約変更も本 Intent で扱う）
- C. 公開入口と補助入口 4 skill だけを監査・修正する
- D. ステージ skill は監査対象からも外す
- X. Other (please specify)

[Answer]: A

---

## Q3. #405 Grilling Decision Trail 生成規約の置き場所

validator が要求する形式（grillings.md の一覧列、session ファイルの必須項目）を、生成側の skill がどこから参照する構造にするか。

- A. 共通テンプレート／生成規約を 1 箇所（amadeus-grilling の references または templates）に置き、Grilling Decision Trail を作る skill はすべてそこを参照する（推奨）
- B. validator 側の schema 定義を正とし、skill からは validator の文書を直接参照する
- C. Grilling Decision Trail を作る各 stage skill に生成規約を直接記載する（重複を許容）
- D. space の memory/templates/ の上書きテンプレートとして置く
- X. Other (please specify)

[Answer]: A

---

## Q4. #252 入力参照契約の適用範囲と受理形式

`#nnn` 短縮参照を GitHub Issue 入力として扱う契約を、どの範囲にどこまで定義するか。

- A. Issue を入力に取る公開 skill に限定して契約を追記する。`#nnn` と Issue URL を等価に扱い、`owner/repo#nnn` も受理し、repository 文脈が曖昧な場合は停止して確認する（推奨）
- B. 全 amadeus-* 公開 skill 共通の入力参照規則として共通 references に 1 個定義し、各 skill はそこを参照する
- C. 公開入口 amadeus だけに契約を追記する
- D. `#nnn` と URL の等価だけ定義し、`owner/repo#nnn` と曖昧時の停止確認は対象外にする
- X. Other (please specify)

[Answer]: A
