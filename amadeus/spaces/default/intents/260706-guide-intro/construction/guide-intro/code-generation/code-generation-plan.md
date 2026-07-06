# Code Generation Plan — guide-intro

上流入力: [business-logic-model.md](../functional-design/business-logic-model.md)（変更対象と各章内容の正）、[requirements.md](../../../inception/requirements-analysis/requirements.md)

## 実施計画と実施結果

| # | 作業 | 実施方法 | 結果 |
|---|---|---|---|
| 1 | 残り実測の採取（orchestrate next の run-stage directive、utility status） | conductor が隔離 workspace で実実行（next-output-trimmed.json、status-output.txt） | 完了 |
| 2 | index + 00-introduction（英日 4 ファイル） | subagent A（amadeus-developer-agent）→ conductor が #541 純正性検証 | 完了（index の 01/02 行は subagent の誤解を conductor が実リンクへ修正） |
| 3 | 01-getting-started + 02-first-workflow（英日 4 ファイル） | subagent B → conductor 純正性検証。掲載出力は実測ログと byte 照合（subagent 自己検証）+ conductor の対一致・残存検査 | 完了（02 用に birth 後 doctor 全 pass の追加実測 1 件を採取） |
| 4 | 参照接続 3 対（language-policy / README / extension-guide） | conductor が直接実施（leader 条件の適用範囲 1 行を含む） | 完了 |
| 5 | parity:check が docs/guide を検査対象にしないことの実測（engineer3 の留意） | `npm run parity:check` → exit 0、出力に docs/guide 言及 0 件 | 完了 |
| 6 | コミット（BR-7 = 章対単位） | 00 対 / 01 対 / 02 対 / index 対 / 参照接続 3 対 / レビュー所見反映 の 6 コミット | 完了 |
| 7 | Codex 初見読者レビュー（NFR-4） | High 4 + Low 3 を受領 → 全件対応（英日同時、commit be75a069）で合格判定 | 完了（対応表は code-summary.md） |

## 検証（実施済み）

- 英語版 4 件の日本語残存 0 件、4 対の H2 数一致（4 / 6 / 5 / 7）。
- リンク機械検査（アンカー込み）: 新設 8 + 追記 3 対 = 14 ファイルで checked=156 broken=0（レビュー所見反映後の最終値）。
- 掲載した全コード block は実測ログと一致（subagent B が byte 単位で diff。省略は「…」、一時パスは <workspace> へ置換し明記）。
- validator + `npm run test:all` は build-and-test 相当の検証で実行し記録する。
