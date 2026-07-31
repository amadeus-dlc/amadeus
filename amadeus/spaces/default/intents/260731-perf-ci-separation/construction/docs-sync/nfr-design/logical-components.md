# Logical Components — U4 docs-sync

上流入力(consumes 全数): business-logic-model.md(U4 FD)。nfr-requirements 5成果物は本 scope で同ステージ SKIP のため設計上不存在(consumes_absent expected:true)— requirements.md の FR-6/NFR-1(ii) と FD の台帳ロジックを一次根拠に具体化する。

測定 ref = observed `da51af375`。

## 論理構成(business-logic-model.md の写像)

| 論理コンポーネント | 実体 | 契約 |
|---|---|---|
| 更新対象台帳 | domain-entities.md の10ファイル表 | C-7 ✅ 集合+再 grep 差分 |
| 対訳同期面 | en/ja 5組 | 同一 PR 内同期(BR-U4-2) |
| 実測記録面 | NFR-1 非退行層の記録 | run ID・測定 ref 必須 |

## 境界

- ❌ 集合(upstream-sync 履歴)無接触。コード内文書面は U1〜U3 既了(検査のみ)
