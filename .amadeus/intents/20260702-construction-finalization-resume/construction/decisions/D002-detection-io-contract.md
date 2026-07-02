# D002: 検出スクリプト入出力契約

## 背景

Inception は、検出スクリプトの出力形式と終了コードの確定を Functional Design へ引き継いだ。

## 判断

- 実行形式は `bun run <script> <workspace>` とし、引数は対象 workspace の path とする。
- 未 finalize の Intent ディレクトリ名を stdout へ1行1件で出力する。
- exit 0 は正常実行（検出0件を含む）、exit 1 は入力エラー（workspace が存在しないなど）とする。
- `.amadeus/intents` がない workspace は対象外として stderr へ通知し、exit 0 とする。

## 理由

- 1行1件の出力は、エージェントが grep や行数で判定でき、eval でも固定入力に対する期待出力を決定論的に検証できる。
- 検出の有無を終了コードに混ぜないことで、「実行の成否」と「検出結果」を分けて扱える。

## 影響

- B001 の eval は、未 finalize あり、なし、対象外の3状態をこの契約で検証する。
- B002 の skill 本文は、この契約を前提に検出結果の読み方を記述する。
