# Business Rules — engine-namespace 改名の規則

上流要求は `../../../inception/requirements-analysis/requirements.md`（制約・N001〜N005）である。

## 不変条件

- `engineFileExceptions` は空を維持する（N001）。改名の吸収は対応表 mapping と内容正規化だけで行う。
- エンジンの挙動、directive 契約、v2 成果物構造は変更しない（N002）。変更は改名・参照更新・parity 機構の一般化に限る。
- workspace `aidlc/`、`aidlc-state.md`、`intents.json`、audit イベント語彙、既存 Intent record は変更しない（N004）。
- audit の記録済みイベントは書き換えない（org.md）。

## 改名規則

- ファイル名は単純置換（`aidlc-X.ts` → `amadeus-X.ts`）とする。接頭辞除去や別名は使わない（requirements Q1 回答）。
- 改名は `git mv` で行い、rename 検出可能な履歴を保つ。
- `.claude/aidlc-common` は symlink 名も `amadeus-common` へ改名する（グリリング Q1 回答）。他の `.claude/` symlink は名前維持でリンク先のみ張り替える。

## 検証規則

- dev-scripts の変更は RED → GREEN の順で進める。対応表 fixture の追加と fail 確認が実装に先行する。
- 旧名残存は N005 の grep で機械的に確認し、許容例外は `aidlc/spaces/**`、`dev-scripts/data/parity-baseline.json`、`dev-scripts/evals/parity/**` の 3 箇所に固定する。
- 完了条件は `parity:check`・`test:all`・`AmadeusValidator` の pass と N005 の 0 件（受け入れ条件、Issue #445）。

## 対応表の整合規則

- 対応表の行は一意であり、`replacement` が他行の `prefix` の部分文字列にならないこと（逆方向正規化の衝突禁止）。
- トークン照合は kind ごとの disambiguation 規則（business-logic-model.md）に従う。tool / hook は**拡張子込みの完全一致**、engine-dir は `.agents/` を含む path 接頭辞一致、common-dir / shared-dir は path セグメント一致、rules-file は path 一致とする。bare token での照合は禁止する。
- 改名禁止語彙（`aidlc-state.md`、`intents.json`、audit イベント語彙、bare の `aidlc/`、`aidlc-docs`）は対応表に載せない。これにより `aidlc-state.ts`（改名対象）と `aidlc-state.md`（v2 成果物、N004）の衝突を構造的に回避する。
- 新しい改名が必要になった場合は、コードではなく対応表へ行を足す（R007 の設計意図）。
