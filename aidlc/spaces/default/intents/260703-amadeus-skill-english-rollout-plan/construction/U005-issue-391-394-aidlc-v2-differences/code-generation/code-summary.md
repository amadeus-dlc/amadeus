# Code Summary：#391〜#394 AI-DLC v2 differences

## 目的

AI-DLC v2 との意味差分を、採用、写像、対象外のいずれかで明示し、Issue ごとに完了証拠を残す。

## #391 reviewer 指定の対応（実施済み）

| ファイル | 変更内容 |
|---|---|
| `docs/amadeus/aidlc-v2-reviewer-mapping.md` | 新規作成。本家 pinned commit `d341522e` の reviewer 指定 11 stage を一覧化し、reviewer sub-agent を採用せず stage gate、PR レビュー、`amadeus-validator` へ写像する判断、`reviewer_max_iterations` と Request Changes 3 回連続規則の対応、採用しない理由、再検討条件を記録した。 |
| 11 skill の `SKILL.md` Gate 節（source + 昇格先） | 本家の reviewer 指定と Amadeus 側の写像を明記した。対象: rough-mockups、requirements-analysis、user-stories、refined-mockups、application-design、units-generation、functional-design、nfr-requirements、nfr-design、infrastructure-design、code-generation。 |
| `examples/skill-provenance.json` | 影響 entry の staleReason に #391 対応の追記を反映した。md5 は書き換えていない。 |

## #393 sensor と Learn の写像（未着手）

## #392 Build and Test の失敗時処理（未着手）

## #394 Operation phase の対象外理由（未着手）

## 対応した要求

| 要求 | 対応 |
|---|---|
| R003 | #391 の完了証拠を対応 PR として記録した。#393、#392、#394 は B005 内で継続する。 |
| R006 | 意味差分の明示（写像）を英語化と別 PR で行い、翻訳と意味変更の境界を維持した。 |

## 検証

各 Issue の PR で実行し、B005 の Build and Test で統括する。

## 未完了

- #393、#392、#394 の対応 PR。
- B005 の Build and Test。
