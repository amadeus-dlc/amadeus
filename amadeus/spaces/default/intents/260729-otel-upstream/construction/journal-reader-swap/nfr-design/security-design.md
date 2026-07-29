# Security Design — U6: journal-reader-swap

上流入力（consumes 全数）: performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md（すべて参照済み）

security-requirements.md の方針（読取経路の防御性・非破壊性・機微情報の非転記）に対する設計。redaction policy 本体は writer 側 Unit の所有であり、本 Unit は読取側の節度のみを設計する。

## 非破壊性の設計

- 共通 reader は書込・probe を持たない読取専用 Interface とし、型上書込 API を公開しない（BR-9、FR-EVT-5 の非破壊性と整合）
- Journal 物理配置（per-clone shard、mkdir lock）を変更しない（BR-10）。差替えは call site の参照先変更のみで、shard の配置・命名・lock 機構に触れない

## 機微情報の非転記

- reader の正規化 record は tool が依存する属性のみへの写像とし、無許可の追加属性（未検証の v2 属性等）を tool へ転記しない。写像は明示的なフィールドリストで行い、record 全体のスプレッド転記を禁止する（BR-15）
- reader 層に tool 独自のフィルタ解釈を移さず、tool 側の既存フィルタロジックはそのまま維持する

## fail-noisy 設計

- 判別不能行は判別可能なエラーとして返し、silently skip を禁止する（BR-4）。v2-only 構成で v1 shard に遭遇した場合も同様にエラーとする（BR-18）。破損・未移行 shard を見落とさないための防御
- エラー経路は doctor の破損行検出テストで固定する

## 境界の不変

- 差替えはローカル FS 読取のみで完結し、新規 credential・network I/O を追加しない（technology-stack.md の構成維持）
- rollback 手段は git revert と差替え前 backup に限定し、特別な権限・外部操作を要しない（BR-6）
- VER-2 credential-free ゲートの配線に変更を加えない（reader 差替えで検査対象は変わらない）
