# Security Requirements — u5-ci-all-models-measure

**Intent**: 260801-tla-multi-model / **Stage**: nfr-requirements / **Unit**: u5-ci-all-models-measure(C6+C9+C10)

上流入力(consumes 全数): business-logic-model(u5 functional-design §2.1 / §6 / §10 — CLI パーサ・ci.yml 差分最小化・不変性), business-rules(BR-C1〜C2 / BR-M4 / BR-S1〜S2), requirements(NFR-2, NFR-3, NFR-4)

本 Unit は認証・認可・データ保護の対象を新たに持たない(外部ネットワーク面なし、PII なし、新規外部依存なし)。適用されるセキュリティ NFR は**権限最小の維持**と **fail-closed の入力検証**である。

## SR-1: CI 権限最小(NFR-3)

- 要件: ci.yml の `permissions: contents: read` を維持し、permissions 追加を行わない。`if: github.event_name == 'workflow_dispatch'` 条件も不変。
- 検査: BR-C1/BR-C2 — `git diff` 目視 + t406 の文字列 pin(timeout / permissions / workflow_dispatch 行の不変ガード)の二重検査。1行でも diff が出たら設計違反。

## SR-2: 入力の fail-closed 検証(NFR-2)

- 要件: `--model` の未登録名は run / verify / diagnostic / skeleton の全 CLI で明示失敗(exit 2)。モデル名の登録判定は loader(`selectVerifiedModel`)経由のみとし、CLI パーサに判定を複製しない(BR-S2)。silent fallback 禁止。
- 補足: skeleton の `--model` は FormalElection 以外を明示失敗(exit 1)とする意図的 fail-closed(BR-S1)。「未対応」を黙って成功扱いしない。

## SR-3: テスト fixture の隔離

- 要件: 注入変異は scratch fixture(workspace コピー + 補正済み model-map)上でのみ行い、repo 実体の `specs/tla/` と model-map.json を汚染しない(BR-M4)。

## N/A 判定

- 認証 / 認可 / セッション管理: **N/A** — 変更対象は CI 内で完結する CLI ツールであり、認証概念を持たない(所有ファイル: plugin tools 4+3、ci.yml、stage doc のみ — BLM §12.1)。
- データ保護 / 暗号化 / PII: **N/A** — 扱うデータは TLA+ spec・evidence JSON・TLC 統計のみで、個人情報・機密情報を含まない(requirements NFR-4 と併せ、新規の外部送信もない)。
- ネットワーク / 公開面: **N/A** — docker TLC 実行は既存の隔離機構(validateDockerReceipt、BR-F2 で不変)内で完結し、新規のネットワーク endpoint を追加しない。
- 依存脆弱性(supply chain): **N/A(新規分)** — NFR-4「新規外部依存なし」により新たな依存監査対象は発生しない。既存依存の監査は既存 CI 体制の範囲。
