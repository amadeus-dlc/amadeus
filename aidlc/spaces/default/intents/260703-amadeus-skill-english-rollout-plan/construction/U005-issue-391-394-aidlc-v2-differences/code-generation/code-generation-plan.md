# Code Generation Plan：#391〜#394 AI-DLC v2 differences

## 目的

B005 として、AI-DLC v2 との意味差分を扱う #391、#393、#392、#394 を、docs/amadeus/aidlc-v2-difference-response-plan.md の順序と PR 境界に従って Issue ごとの個別 PR で対応する。

各差分は、採用、写像、対象外のいずれかで明示する。

## 実行境界

- 英語化 PR と意味変更 PR を分ける。英語化（B006〜B009）は PR #417 で完了済みのため、本 Bolt の各 PR は意味差分の判断だけを扱う。
- 任意の reviewer agent 実装、`.aidlc-sensors/` 相当の仕組み追加、修正の自動再試行実装、Operation skill の追加は含めない。

## 変更対象

| Issue | 変更対象 | 変更内容 |
|---|---|---|
| #391 reviewer 指定の対応 | `docs/amadeus/aidlc-v2-reviewer-mapping.md`（新規）、reviewer 指定がある本家 stage に対応する 11 skill の `SKILL.md` Gate 節、昇格先 | reviewer 指定の一覧化と、stage gate・PR レビュー・`amadeus-validator` への写像の明記。 |
| #393 sensor と Learn の写像 | 対応 PR で確定する | sensor ごとの検証先と Learn の記録先の明記。 |
| #392 Build and Test の失敗時処理 | 対応 PR で確定する | halt-and-ask と Code Generation 責務分離の維持可否の判断と記録。 |
| #394 Operation phase の対象外理由 | 対応 PR で確定する | 対象外理由の明文化と本家 Operation skill 一覧の扱い。 |

## 検証方法

Code Generation ではテスト実行結果を記録しない。

各 Issue の PR で `npm run test:all`、Amadeus Validator、skill 変更時は `promote-skill.ts --replace` と `test:it:promote-skill` を実行し、B005 の Build and Test で統括する。

## 対象外

- Issue #399 の close 判断（B010）。
- provenance の real provider 再生成（独立の後続 PR）。
