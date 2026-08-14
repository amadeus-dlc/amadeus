# Requirements Analysis 質問 — Election CLI 多問対応

## Context

[Intent Statement](../../ideation/intent-capture/intent-statement.md)、[Scope Document](../../ideation/scope-definition/scope-document.md)、CodeKB の [Business Overview](../../../../codekb/amadeus/business-overview.md)、[Architecture](../../../../codekb/amadeus/architecture.md)、[Code Structure](../../../../codekb/amadeus/code-structure.md) を入力とする。full autonomy の裁定ラダーで、実装を検証可能にするための未決事項を解決する。

## Q1: 多問 Election の正本となる aggregate は何か？

- A. 一つの Election が stable ID 付き `questions[]` を直接所有する
- B. 親 Election が単問の子 Election ID 集合を所有する bundle とする
- C. 既存単問 Election を連続実行し、bundle データは保存しない
- D. 一つの question 文字列へ複数問を埋め込み、ballot だけ配列化する
- E. model は単問のまま、CLI 表示だけ多問化する
- X. Other (please specify)

[Answer]: A（E-OC1: full autonomy 裁定 auto-decision-b1aa14465b9fda32c9aec2f5bb0fb0a8）

## Q2: question ID の契約は何か？

- A. definition の作成者が明示する非空文字列で、Election 内一意かつ再実行を通じて不変とする
- B. 質問文の hash から自動生成する
- C. questions 配列の位置を ID とする
- D. choice の internalNo を question ID と兼用する
- E. 永続化せず、実行時だけ生成する
- X. Other (please specify)

[Answer]: A（E-OC1: full autonomy 裁定 auto-decision-af989432f9ecbeb3371d1802e32ae086）

## Q3: voter の ballot は複数問への回答をどう保持するか？

- A. voter ごとの1 ballot に question ID で識別した `responses[]` を保持する
- B. question ごとに ballot ファイルを分割する
- C. 一つの scalar choice を全 questions に適用する
- D. question ごとに独立した voter ID を作る
- E. responses は tally 時だけ生成し、元票には保存しない
- X. Other (please specify)

[Answer]: A（E-OC1: full autonomy 裁定 auto-decision-935506e95d72c295ab4ab1746b76d865）

## Q4: mixed result と再実行の不変条件は何か？

- A. question ごとに established/hold を保持し、established は不変、再実行は hold の question ID だけを対象にする
- B. 一問でも hold なら全 question を再実行する
- C. established も再実行時に再評価するが、同じ結果を期待する
- D. mixed result は表示だけ行い、保存時は全体 hold に丸める
- E. 最初の hold question だけを保存する
- X. Other (please specify)

[Answer]: A（E-OC1: full autonomy 裁定 auto-decision-561dc4a092b2e3cbb149bbb97e7bf51c）

## Q5: 既存単問データとの互換性をどこまで保証するか？

- A. 旧形式を意味的に後方読み取りして新 canonical model へ正規化し、新規書き込みは新形式に限定する
- B. 旧 JSON/record と byte-for-byte 同一の新規出力を維持する
- C. 起動時に既存データをすべて破壊的に新形式へ変換する
- D. 旧形式の読み取りを打ち切る
- E. 旧形式は migration CLI を明示実行した場合だけ読める
- X. Other (please specify)

[Answer]: A（E-OC1: full autonomy 裁定 auto-decision-2a09e5f7b4fafdb9f1d642c13aa0612a）

## Q6: 多問化に伴う性能・サイズ要件をどう置くか？

- A. 任意の小さい固定上限を追加せず、question 数と response 数に対して線形に処理し、既存単問性能を実質退行させない
- B. question は最大5件に固定する
- C. question は最大10件に固定する
- D. 全組合せを事前計算し、サイズ制約を設けない
- E. 性能は要件化せず、機能だけを検証する
- X. Other (please specify)

[Answer]: A（E-OC1: full autonomy 裁定 auto-decision-d5271db0009e560bfaa29cc8d9611398）
