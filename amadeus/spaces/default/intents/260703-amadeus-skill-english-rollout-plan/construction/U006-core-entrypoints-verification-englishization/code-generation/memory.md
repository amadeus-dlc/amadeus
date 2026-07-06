# Code Generation Memory：Core entrypoints and verification 英語化

## 解釈

- 「skills/ 以下の全面英語化」は、Skill Language Policy に従い `SKILL.md` 本文と frontmatter description を対象にした。templates、references、evals は日本語維持対象または対象外である。
- ユーザー入力の scope 推定キーワード（`バグ`、`リファクタリング` など）は、日本語入力を照合するための挙動リテラルであるため翻訳しなかった。表ヘッダ（`手掛かり` → `Clues`）だけ英語化した。
- `amadeus-validator` の結果報告形式は、ユーザー向け出力が日本語である契約を守るため、埋め込みテンプレートごと日本語で保持した。

## 逸脱と対処

- 契約 needle の長文 2 文が 80 桁折返しで分断され、`test:it:amadeus-templates` の substring 照合に失敗した。該当 2 文を 1 行に結合して解消した。

## トレードオフ

- provenance は md5 を書き換えず staleReason で維持した。real provider 再生成は後続 PR で行う（Artifact Rules の一時例外運用に従う）。

## 未解決の問題

- なし。
