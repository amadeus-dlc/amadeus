# Tech Stack Decisions — election-store(nfr-requirements)

> 上流入力(consumes 全数): business-logic-model.md、business-rules.md、requirements.md、technology-stack.md

## 選定と根拠

| 領域 | 選定 | 根拠 |
|---|---|---|
| 言語/ランタイム | TypeScript/ESM+Bun 直接実行 | requirements.md NFR-1+codekb technology-stack.md の既存スタック実測 |
| 永続形式 | JSON ファイル(election.json/ledger.json ほか — business-logic-model.md レイアウト) | ファイル正本の既決(FR-1a C-07)。既存 record 系(intents.json 等)と同型で、git diff 可読・checkpoint コミット対象 |
| 原子性 | Bun fs の tmp+rename(自前ヘルパー数行) | business-logic-model.md C2 既決の既習様式。外部ライブラリ(write-file-atomic 等)は依存最小方針+規模正当化により不採用 |
| ロック | 導入しない | 単一書込主体(D-09 導出 — business-logic-model.md 並行性節)。mkdir ロック等の既存機構の流用も、前提(複数書込者)が成立しないため不要 |
| テスト | bun test・integration 層(実 FS) | requirements.md NFR-2(fs-tests-integration-first)+business-rules.md のテスト列。クラッシュ注入(tmp 書込途中相当の状態 fixture)は transient-state-fixtures と**同型の設計判断の援用**(当該 cid の確定スコープは検査述語の corpus sweep — ここでは『コミットされない中間状態を明示的に fixture 化する』考え方のみを類推適用) |

## 却下した代替

- SQLite 等の組込 DB — technology-stack.md に SQLite3 実測はあるが外部 agmsg 側の採用であり、U2 の要件(選挙1件分の小規模 JSON・git 可読性・依存最小)には過剰。JSON ファイル+atomic write で十分
- 楽観ロック/ファイルロック — 単一書込主体の構造保証(E-ETF-FD2 (1) 承認)と重複する防御であり、検証劇場 Forbidden の「消費されない検証」類型に近づくため不採用
