# Security Test Instructions — 260817-inception-cost-batch

## 適用範囲の判定

requirements に独立したセキュリティ NFR の数値目標はない(`c2-no-test-theatre-for-absent-nfr` — SAST/DAST 等の別枠スイートは新設しない)。ただし本 intent は GitHub 境界(信頼境界)へ read 面を追加するため、**既存のセキュリティ規律の継承を実装テストで検証済み**である。その面だけをここに棚卸しする。

## 検証済みのセキュリティ面(実装テスト内で被覆)

| 面 | 検証 | 場所 |
|---|---|---|
| credential 非保持 | gateway の redaction テンプレート維持(raw stdout/stderr を失敗要約へ運ばない)を adapter テストが継承検証 | t3181-issue-evidence-gateway |
| 認可境界 | evidence adapter は read-only で mutation permit 非対象(ADR-1)。write 系 permit 検証は既存 mirror/finding テストが正 | 設計上の非接触 |
| 入力検証 | `--issues` の正整数 CSV 検証・URL guard(https/host/segment)・DTO 防御的 parse の負分岐 | t3181 gateway/fetch テスト |
| 取得データの信頼境界 | Issue 本文・コメントは untrusted data として verbatim 保存のみ(実行・展開しない)。消費側規範は RA 契約の「claims to test」原則が担う | artifact 様式テスト |

## 将来この判定を覆す条件

- issue-evidence へ書込系 GitHub 操作が追加された場合(permit 検証が必須化)
- 取得内容を機械実行・テンプレート展開する消費者が現れた場合(injection 面の検査が必要化)
