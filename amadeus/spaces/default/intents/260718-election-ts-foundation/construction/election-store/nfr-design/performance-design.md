# Performance Design — election-store(nfr-design)

> 上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md

## 設計方針

performance-requirements.md の「追記 O(1)+全量書き戻し・最適化不要」を次で実現する:

- appendBallot/appendTimeline は「load → メモリ上で追記 → writeFileAtomic 全量書き戻し」の3段(business-logic-model.md 操作フロー)。ファイルは票数規模(数十 KB 未満)のため差分書込・インデックスを設けない
- 書込パスは tech-stack-decisions.md 確定の tmp+rename ヘルパー1つに集約 — 性能とクラッシュ耐性(reliability-requirements.md)を同一機構で満たし、二重の書込経路を作らない

## 検証設計

- 性能ベンチマークなし(performance-requirements.md)。I/O の検証は integration 層の実 FS テスト(security-requirements.md の書込境界検査・scalability-requirements.md のステートレス前提と共通の fixture 基盤)で行い、実行時間は既存ランナーのタイムアウトが上限
