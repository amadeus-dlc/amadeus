# R004: skill と eval の整合

## 要求

- source skill、昇格先 skill、関連 eval が同じ実行時問題報告契約を説明している。

## 受け入れ条件

- source skill と昇格先 skill の報告契約が同じ分類基準と最低項目を示している。
- 代表 skill の対象範囲が Construction 成果物から追跡できる。
- 関連 eval が、報告契約の存在または対象外理由を確認できる。
- source skill から昇格先 skill へ反映する場合は、手動同期ではなく既存の昇格手順を使う。
- 報告契約が validator の構造検証と内容承認を混同していない。

## 根拠

- `.agents/rules/amadeus-artifacts-and-examples.md` は、`skills/amadeus-*/` を `.agents/skills/amadeus-*/` へ反映する場合に `dev-scripts/promote-skill.ts` を使うことを求めている。
- `dev-scripts/evals/llm-templates/check.ts` と `dev-scripts/evals/amadeus-templates/check.ts` は、skill 実行期待とテンプレート契約の検証入口である。

## 未確認事項

- 代表 skill の最終対象範囲は Construction で差分規模を見て確定する。
