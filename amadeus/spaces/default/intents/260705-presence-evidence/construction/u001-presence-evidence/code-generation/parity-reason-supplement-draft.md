# Parity Reason Supplement Draft — u001-presence-evidence（260705-presence-evidence）

上流入力: [business-logic-model.md](../functional-design/business-logic-model.md) 手順 3、[reliability-design.md](../nfr-design/reliability-design.md)

## 位置づけ

対象は `dev-scripts/data/parity-map.json` の既存 `exceptions` エントリ（#499 由来。target: `tools/aidlc-state.ts、tools/aidlc-lib.ts、tools/aidlc-audit.ts（…）、knowledge/aidlc-shared/audit-format.md（…）`）の `reason` フィールドである。

BR-7 により、このエントリへの実書き込みは PR #428 の merge 後にのみ行う。#428 は同エントリの構成（対象ファイル一覧、events カウント表記）自体を変更中であるため、以下の一文は **最終的な語順・接続が post-#428 のエントリ形状に合わせて調整され得る**。ただし追補の内容（Issue 番号、判断内容、他 3 ファイルの説明との分離）は変えない。

## 追補文（日本語、独立文として reason 末尾に追加する）

```text
Issue #506: audit-format.md に Evidence Verification Boundary 節を追加（presence 相関の不採用と防衛線の明文化。人間承認 DECISION_RECORDED requirements-analysis 2026-07-06）。
```

## 分離の確認

既存 reason は tools 3 ファイル（`amadeus-state.ts` の `declare-docs-only` / `GUARD_EXEMPTED`）の説明で完結しており、上記の一文はそれとは独立した文（句点で区切られた別文）として末尾に追加する。したがって「tools 側の実装説明」と「audit-format.md への文書追記の説明」が同一文中で混同されることはない。
