# Performance Test Instructions — 260807-failclosed-recovery-path

上流入力(consumes 全数): 各 unit の `code-generation-plan.md` と `code-summary.md`。requirements の非機能要件(NFR-1〜5)を走査した結果に基づく。

## 適用判定 — 適用外(専用試験なし)

本 intent の承認済み NFR(NFR-1 TDD / NFR-2 検証コマンド集合 / NFR-3 ゲート呼出規約 / NFR-4 配布境界 / NFR-5 台帳波及)に性能要件は存在しない。Comprehensive 戦略でも、対応する NFR が不在なら専用性能試験を新設しない(`cid:build-and-test:c4` — 名ばかりの試験は検証劇場になる)。

## 患部に対応する既存面

- 変更対象(reconcile 述語・recover verb・宣言 reader)はいずれも単発 CLI 実行の決定的関数であり、常駐サービスの負荷特性を持たない。
- リグレッション面は既存 CI の test-size classification ratchet と t258 系 p95 ベンチマーク(no-silent-drop gate 実行時間)が包括しており、本変更で新たな性能面は増えていない。
