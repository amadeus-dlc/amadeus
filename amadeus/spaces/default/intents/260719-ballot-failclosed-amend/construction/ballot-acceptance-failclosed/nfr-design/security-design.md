# Security Design — U1 ballot-acceptance-failclosed

上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md

## 設計(S-1〜S-3 の実現)

- **S-1(境界 fail-closed)**: 検証は parse(形式)→ store(実在)の二層で、どちらも Result 型の err 返却のみ — 例外 throw を新設しない(既存様式維持)。エラー分類の順序は BR-1 固定順で、関数内に fail-closed 順序の明文コメントを置く(NFR-1)。
- **S-2(秘匿情報なし)**: kind/ref の追加フィールドは識別子のみ(security-requirements.md のフィールド直接確認を実装でも維持 — 新規フィールドにログ・環境変数由来の値を入れない)。
- **S-3(監査可能性)**: appendBallot は original を一切変更しない(ADR-5)— unknown-ref 照合は読取のみで、失敗時も ledger 無変更(writeStoreFile 到達前に err 返却)。

## レビュー観点への引き継ぎ

要求にない互換レイヤー・フォールバック分岐の混入禁止(org Mandated)— 特に「不正 timestamp を警告付きで受理する」類の軟化分岐を作らない(fail-closed の徹底)。
