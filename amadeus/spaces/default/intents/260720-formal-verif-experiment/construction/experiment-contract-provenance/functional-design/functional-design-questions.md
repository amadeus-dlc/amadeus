# Functional Design 質問 — experiment-contract-provenance

本質問は `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md` の既決事項だけを確認する。

## Q1. 結果identityの正準化方式

- A. schema parser通過後のJSON object keyを再帰的に辞書順へ並べ、array順序を保持したUTF-8 bytesのSHA-256を使う
- B. schema fieldを連結した独自文字列のSHA-256を使う
- C. 外部canonical JSON依存を追加する
- X. その他

[Answer]: A — `component-methods.md` の「canonical JSON」とNFR-1の再現性を機械化する。未知field・非JSON値はparserで先に拒否し、hash関数へ到達させない。外部依存は追加しない。（E-FVEAD3）
**Basis:** `component-methods.md` Experiment Contract、`requirements.md` NFR-1/NFR-4
**Ruling evidence:** E-FVEAD3でrepo-local contract境界を確定し、確定済み`component-methods.md`がcanonical JSONを指定

## Q2. provenance ledgerと導出stateの整合方式

- A. append-only event ledgerを唯一の正本とし、stateは検証済みevent列のfoldで導出する
- B. event ledgerと可変state fileを別々に更新する
- C. stateだけを保存しeventを省略する
- X. その他

[Answer]: A — `components.md` のauthoring event ledger契約と、project memoryのaudit batch-before-state atomicityを適用する。1 commandが複数eventを生む場合は全blockを事前検証し、単一transactionとしてappendする。（E-FVEADS13R / E-USSU02FDS13 / E-USSU02FDS14）
**Basis:** `components.md` Blind公開state machine、`project.md` cid:functional-design:audit-batch-before-state-atomicity
**Ruling evidence:** E-FVEADS13Rのblind state machine、E-USSU02FDS13/E-USSU02FDS14のatomicity persist

## Q3. frontend成果物の要否

- A. frontend/UIなしとして生成しない
- B. CLI画面をfrontend componentとして設計する
- C. report viewer UIを追加する
- X. その他

[Answer]: A — `services.md` はlocal non-interactive CLIだけを定義し、AWS/UIを対象外としている。optional `frontend-components.md` は生成しない。（E-FVEAD3）
**Basis:** `services.md` service stance、`components.md` 変更境界
**Ruling evidence:** E-FVEAD3でrepo-local scripts/tests/record配置とUI不存在を確定
