# Logical Components — u4-tools-distribution

上流入力(consumes 全数 — requirements は宣言5件の consumes_absent fallback 先、business-rules/domain-entities は同 unit FD の随伴成果物): requirements, business-logic-model, business-rules, domain-entities

## コンポーネント表

| 論理コンポーネント | 実体 | NFR 関与 |
|---|---|---|
| manifest tools 検証 | parseTools+expectRelPath(M1) | path traversal 遮断(security) |
| compose/drop 対称+digest | M2/M3 | 改竄検出 fail-closed(security/reliability) |
| 一括 compose | M4(compose --all-harnesses) | 有界直列+fail-closed 集計(scalability/reliability) |
| 本 repo 適用 | M5 | FR-B1 AC の実測面 |

## 依存方向

M1(検証)→ M2(書込+digest)→ M3(drop 対称)。M4 は M1〜M3 の合成を hostRoot 集合へ反復。逆方向依存なし。

## NFR 対応の全数表

| NFR | 本 unit での扱い |
|---|---|
| NFR-1(検証二層) | t379+既存 plugin テスト群は日常 CI 層(TLC 面非接触) |
| NFR-2(TDD) | 挙動追加につき TDD 必須(business-rules.md BR-U4-1) |
| NFR-3(配布同期) | core 変更につき dist 7 ハーネス+self-install 同一 PR(BR-U4-4) |
| NFR-4(台帳整合) | 新テストの registry 追従+allowlist へ触れる場合の remap |
| NFR-5(ゲート実効) | digest 対称の落ちる実証(BR-U4-3)が本 unit の実効性検証 — 新設「ガード」は持たないが、落ちる実証の規律は適用(u3 の corpus sweep 要件とは別面) |
