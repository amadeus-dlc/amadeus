# Logical Components — u3-boundary-guard

上流入力(consumes 全数 — requirements は宣言5件の consumes_absent fallback 先、business-rules/domain-entities は同 unit FD の随伴成果物): requirements, business-logic-model, business-rules, domain-entities

## コンポーネント表

| 論理コンポーネント | 実体 | NFR 関与 |
|---|---|---|
| 検査対象4面 | G1(business-logic-model.md) | 偽陰性防止(reliability) |
| 禁止パターン判定 | G2(出現単位・grep -v 不使用) | 決定性(reliability) |
| verdict 出力 | G3(loud 列挙+exit) | fail-closed(security) |
| 許容リスト | E3(初期空・理由必須) | fail-closed(security) |

## 依存方向

4面走査 → 判定 → verdict の一方向。許容リストは判定のみが読む。

## NFR 対応の全数表

| NFR | 本 unit での扱い |
|---|---|
| NFR-1(検証二層) | t377 は日常 CI 層(TLC 面非接触) |
| NFR-2(TDD) | 新設ガードにつき TDD 必須(business-rules.md BR-U3-1 — Red 実測から) |
| NFR-3(配布同期) | テスト追加のみで dist 非接触が原則(触れる場合は同一 PR 再生成) |
| NFR-4(台帳整合) | 新テストの coverage registry 追従のみ |
| NFR-5(ゲート実効) | **本 unit が NFR-5 の主対象** — 落ちる実証+corpus sweep の両側実測(I2、requirements FR-A6/NFR-5) |
