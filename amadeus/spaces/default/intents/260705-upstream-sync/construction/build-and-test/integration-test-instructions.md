# integration-test instructions（260705-upstream-sync）

上流入力: [code-summary.md](../upstream-sync/code-generation/code-summary.md)、[requirements.md](../../inception/requirements-analysis/requirements.md)

## 検証手順

1. `npm run test:it:engine-e2e` — 隔離 workspace での実 CLI 駆動（intent-birth → run-stage directive → produces 拒否 → 承認拒否 → audit shard）。取り込み後のエンジンが従来契約を保つことの統合検証。
2. `npm run test:it:installer` — インストーラ MANIFEST（エンジン 7 dir / symlink 7 entry / hooks 配線）と dist 構成の整合（R009）。amadeus-compose skill が glob で自動捕捉されることを含む。
3. `npm run test:it:promote-skill` — skills/ 正準ソースと昇格先の同期整合。
4. いずれも `npm run test:all` に含まれる。
