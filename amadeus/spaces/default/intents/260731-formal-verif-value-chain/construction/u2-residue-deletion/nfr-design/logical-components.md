# Logical Components — u2-residue-deletion

上流入力(consumes 全数 — requirements は宣言5件の consumes_absent fallback 先、business-rules/domain-entities は同 unit FD の随伴成果物): requirements, business-logic-model, business-rules, domain-entities

## コンポーネント表

| 論理コンポーネント | 実体 | NFR 関与 |
|---|---|---|
| 削除対象集合(D 30) | domain-entities.md E1 の固定目録 | 列挙照合 fail-closed(reliability) |
| 参照テスト3値判定 | business-logic-model.md D2 | green 維持(performance/reliability) |
| 台帳整理 | D3/D4(分類 D 分の削除) | NFR-4 stale 0 |
| registry 追従 | D5(gen-coverage-registry 再生成) | テスト宇宙の整合 |

## 依存方向

D1(ファイル削除)→ D2(テスト)→ D3/D4(台帳)→ D5(registry)の一方向(business-logic-model.md の実行順序)。

## NFR 対応の全数表

| NFR | 本 unit での扱い |
|---|---|
| NFR-1(検証二層) | 既存 CI green 維持のみ(TLC 面非接触) |
| NFR-2(TDD) | 純削除につき適用外条項 — 代替検証は前後 green(BR-U2-4) |
| NFR-3(配布同期) | dist に投影されていた削除分の再生成を同一 PR で実施 |
| NFR-4(台帳整合) | 分類 D 分エントリの削除+stale 検査 0(D3/D4) |
| NFR-5(ゲート実効) | **N/A** — 新設ガードなし(FR-A6 は u3 スコープ)。削除の安全性は列挙照合 fail-closed が担う |
