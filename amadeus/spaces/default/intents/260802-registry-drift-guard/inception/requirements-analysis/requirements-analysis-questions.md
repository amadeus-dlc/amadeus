# Requirements Analysis Questions

## 上流コンテキスト

- intent-statement: Issue #2037 の文書バックフィルと分離し、同種のレジストリ不整合を機械検出して再発を防ぐ。
- scope-document: `self-fix`、Depth Minimal、Test Strategy Comprehensive。実装・テスト・必要最小限の正本文書同期を対象とする。
- business-overview: Amadeus の CLI と stage 定義は複数の人間可読一覧を持ち、実装変更時に同期漏れが起きうる。
- architecture: CLI verb dispatcher、stage schema、仕様書、利用者向け reference、CI の変更検出が関係する。
- code-structure: `amadeus-state.ts`、stage schema、stage-definition protocol、reference docs、テスト／CI 経路が主要境界である。
- team-practices: 単一ソースと bidirectional drift 検出を優先し、ガードは負例で実際に落ちることを確認する。doc-consuming test は docs-only 変更でも実行されなければならない。

## 質問

### Q1. 変更スコープをどこまで許可しますか？

A. `self-fix` とし、機械ガード、回帰テスト、CI 配線、ガードが読む必要最小限の文書レジストリを同期する（推奨）
B. `self-document` とし、文書だけ直して実行可能な再発防止ガードは追加しない
C. `self-fix` とするが、文書レジストリは変更せずコード側だけで検出する
D. 今回は調査結果のみ残し、実装を別 intent に分離する
X. Other (please specify)

[Answer]: A. `self-fix` とし、機械ガード、回帰テスト、CI 配線、ガードが読む必要最小限の文書レジストリを同期する（推奨）

### Q2. 今回のガード対象をどこまで含めますか？

A. CLI dispatch と `Valid:` verb 一覧、および stage schema と仕様／reference registry の両方を対象にする（推奨）
B. CLI verb の不一致だけを対象にする
C. stage field の不一致だけを対象にする
D. 両方に加え、他のレジストリ対も探索して対象を拡大する
X. Other (please specify)

[Answer]: A. CLI dispatch と `Valid:` verb 一覧、および stage schema と仕様／reference registry の両方を対象にする（推奨）

### Q3. stage field registry の一致契約はどれにしますか？

A. schema の受理フィールド集合をコード上の正本とし、仕様／reference の機械可読な完全一覧との双方向一致・重複なし・空抽出禁止を検証する（推奨）
B. 仕様書の表を正本とし、schema を表へ合わせる
C. reference の詳細 H3 見出しだけを完全一覧として扱う
D. 件数だけ比較し、フィールド名の集合差は検証しない
X. Other (please specify)

[Answer]: A. schema の受理フィールド集合をコード上の正本とし、仕様／reference の機械可読な完全一覧との双方向一致・重複なし・空抽出禁止を検証する（推奨）

### Q4. 現在 schema が受理する `when` フィールドをどう扱いますか？

A. サポート済みフィールドとして仕様／reference registry を実装へ合わせ、ガード対象に含める（推奨）
B. reserved の記述を正とし、schema と parser から `when` の受理を削除する
C. 今回は `when` をガード対象外にして不一致を残す
D. `when` の扱いだけ別 Issue／intent に分離する
X. Other (please specify)

[Answer]: A. サポート済みフィールドとして仕様／reference registry を実装へ合わせ、ガード対象に含める（推奨）

## 回答記録

- **Mode:** Guide me
- **ユーザー承認:** 2026-08-02T18:26:52Z — 「すべて、推奨選択して。」に基づき Q1〜Q4 の推奨案 A を一括確定した。

### Q5. 上記の回答内容で要件成果物を生成してよいですか？

A. はい、この内容で生成する（推奨）
B. いいえ、回答を修正する
X. Other (please specify)

[Answer]: A. はい、この内容で生成する（推奨）

- **ユーザー承認:** 2026-08-02T18:27:24Z — 要件成果物の生成を承認した。
