# Security Design — U1 tie-choice-resolution

上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md — 各 S 要求の実装位置は business-logic-model.md の検証境界節に固定し、S-1 の二段検証形は performance-design(P-1/P-2 と同一コード)と共有。tech-stack-decisions.md の新規外部境界ゼロが攻撃面の不変を保証。

## 設計

| NFR | 実装形 |
| --- | --- |
| S-1 | 検証はシステム境界1点(handleHoldResolved の tie 分岐)— prefix parse(P-1 の regex)→ 実在照合(P-2 の some)の二段。どちらの失敗も同一の fail() 経路(loud、exit 1) |
| S-2 | 検証通過後にのみ HoldResolution を構築して DURABLE append — 無効値の永続化経路は構文上存在しない(parse-don't-validate。reliability-design R-1 の append 順と同一コードブロック) |
| S-3 | 新規外部境界・秘匿情報アクセスなし(変更は election.ts 内部分岐+SKILL md 3面 — tech-stack-decisions.md の新規導入ゼロ) |
| S-4 | エラー文言は入力 resolution 値+valid 列挙のみ(既存様式 — 内部パス・スタック非出力)。scalability SC-2 のとおり列挙は choices 数に線形で情報量は選挙定義の公開情報に限る |

## 検証との対応

S-1/S-2 の実装形は FR-1/FR-4 の loud 拒否・閉包テストがそのまま検証面(performance-requirements.md の検証対応と同一テスト群 — 専用セキュリティテストの二重追加はしない)。
