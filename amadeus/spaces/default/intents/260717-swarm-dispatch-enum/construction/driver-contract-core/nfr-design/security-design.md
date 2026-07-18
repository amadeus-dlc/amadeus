# Security Design — driver-contract-core(swarm-dispatch-enum / Issue #1157)

上流入力(consumes 全数): `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## 設計

- SD-1(SNR-1): エラーメッセージは raw 値+DRIVER_VALUES 由来の許可値列挙のみで構成(テンプレートに他 env・パスを混ぜない)。既存 fail idiom(stderr JSON)へ写像
- SD-2(SNR-2): raw 値は比較対象としてのみ使用 — 文字列連結によるコマンド・パス生成を行わない(実装構成で担保、レビュー観点に明記)
- SD-3(SNR-3): fail-closed は判別 union の rejected ケースが唯一の経路 — 「未知値→floor」の分岐を書けない型構成(DriverResolution に該当変種がない)で構造的に防ぐ

## 保証機構(層別)

- 型層: rejected は driver フィールド非保持(誤用の表現不能)
- CLI 層: rejected → exit 1 の写像は単一箇所
