# Domain Entities — u2-residue-deletion

上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

本書の実体集合は components.md C10(削除面)の分類定義と component-methods.md C10 の削除面契約から導出し、services.md の配布面契約(D 系は配布対象外)を保存条件 E3 の根拠とする。

## E1: 分類 D ファイル集合(削除対象、30 ファイル)

arm-s-model-subject.ts, arm-s-oracle.ts, arm-s-result.ts, arm-s-runner.ts, arm-s-universe.ts, dispatcher.ts, eligibility.ts, eligibility-report.ts, evidence-bundle.ts, evidence-completeness.ts, execution-evidence.ts, execution-policy.ts, final-cli-root.ts, fixture-proof.ts, fixture-registry.ts, fixture-registry-domain.ts, fixture-scan.ts, fs-evidence-store.ts, fs-provenance-store.ts, full-matrix.ts, full-matrix-cost.ts, index.ts, proof-policy.ts, provenance.ts, receipt.ts, repository-path-policy.ts, tla-skeleton.ts, tla-skeleton-contract.ts, tla-skeleton-outcome.ts, fs-fixture-registry.ts

(codekb code-structure.md の 260731 節の機械算出目録 — u1 完了後の scripts/formal-verif/ 残存全数と実装時に照合)

## E2: 随伴削除面

- 参照テスト群(D2 の列挙規則で確定 — 起草時参考: tests/ の formal-verif 参照 93 パスのうち D のみ参照分)
- tests/formal-verif/{fixtures,support}/ の D 系 harness(A/B/C 系 runner が使う fixture は残す — 個別判定)
- 台帳2面の D 分エントリ(D3/D4)
- coverage registry の該当行(D5)

## E3: 保存対象(削除しない)

- experiment/eligibility-report.md 等の record 配下成果レポート(I4 — ノルム出典)
- u1 移設済みの 24 ファイルとその参照一式
- unit-of-work.md u2 の AC が引く検証面(run-tests.sh --ci 等)
