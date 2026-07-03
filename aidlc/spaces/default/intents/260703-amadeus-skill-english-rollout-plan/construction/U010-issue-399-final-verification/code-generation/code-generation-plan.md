# Code Generation Plan：#399 最終検証

## 目的

B010 として、Issue #399 の完了条件を新しい証拠で確認し、最終 traceability を確定する。

## 確認する完了条件

| 条件 | 確認方法 |
|---|---|
| Amadeus 系 `SKILL.md` の全面英語化 | source 32 件と昇格先 32 件の日本語残存 grep。残存が許容リテラル（`未確認` 等の成果物向けリテラル、生成成果物の見出し名、ユーザー向け日本語文言、埋め込みテンプレート）だけであること。 |
| source と昇格先の同期 | 全 32 skill の `SKILL.md` diff がゼロであること。 |
| B001〜B009 の完了証拠 | 各 Bolt の PR merge と Issue close を traceability で確認できること。 |
| #391〜#394 の差分判断 | 採用、写像、対象外のいずれかで明示され、mapping docs から追跡できること。 |
| 検証 | `npm run test:all`、`npm run validate:all`、Amadeus Validator（対象 Intent 指定）、`git diff --check` が pass すること。 |

## 変更対象

| 対象 | 変更内容 | 理由 |
|---|---|---|
| `construction/U010-issue-399-final-verification/code-generation/*` | 最終検証の計画、結果要約、memory を追加 | #399 close の判断材料を記録するため。 |
| `construction/bolts/B010-issue-399-final-verification/*` | Bolt record を追加 | 検証コマンドと結果を記録するため。 |
| `construction/traceability.md` | B005 完了と B010 実施を反映し、最終判断を更新 | #399 の完了条件を追跡可能にするため。 |
| `aidlc-state.md`、`audit/audit.md` | B005 完了確定と B010 の進行を記録 | 状態と履歴を契約どおり保つため。 |

## 対象外

- Issue #399 の close 操作そのもの（B010 PR の merge で確定する）。
- provenance の real provider 再生成（独立の後続 PR）。
- Construction phase 境界処理（B010 完了後に phase PR として実施する）。
