# Build and Test Summary：B004 #402 残り展開単位

## 目的

Issue #402 の受け入れ条件として、残り Amadeus skill の英語化単位、優先順位、検証コマンド、#391 から #394 との衝突回避を確認した。

## 確認したこと

| 項目 | 結果 |
|---|---|
| 英語化単位 | AI-DLC v2 difference PRs、Core entrypoints and verification、Construction stage skills、Inception stage skills、Ideation stage skills、Supporting analysis and review skills に分けた。 |
| 優先順位 | 代表 skill 完了後、AI-DLC v2 difference PRs、Core、Construction、Inception、Ideation、Supporting analysis and review の順にした。 |
| 検証コマンド | `promote-skill.ts`、`test:it:promote-skill`、`test:all`、Amadeus Validator、`git diff --check` を定義した。 |
| #391 から #394 との衝突回避 | #391、#393、#392、#394 は英語化単位の PR に混ぜない方針を明記した。 |
| テスト | `npm run test:all` と Amadeus Validator が pass した。 |

## 未完了

- B004 PR の作成。
- B004 PR merge または Issue #402 close による #402 完了証拠の確定。
- #399 完了判断。
