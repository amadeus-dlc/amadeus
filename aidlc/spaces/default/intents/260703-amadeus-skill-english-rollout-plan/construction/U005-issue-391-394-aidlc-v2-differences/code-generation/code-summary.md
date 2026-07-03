# Code Summary：#391〜#394 AI-DLC v2 differences

## 目的

AI-DLC v2 との意味差分を、採用、写像、対象外のいずれかで明示し、Issue ごとに完了証拠を残す。

## #391 reviewer 指定の対応（完了）

PR #419（merge commit `24b6a505`）の merge により Issue #391 は close された。

| ファイル | 変更内容 |
|---|---|
| `docs/amadeus/aidlc-v2-reviewer-mapping.md` | 新規作成。本家 pinned commit `d341522e` の reviewer 指定 11 stage を一覧化し、reviewer sub-agent を採用せず stage gate、PR レビュー、`amadeus-validator` へ写像する判断、`reviewer_max_iterations` と Request Changes 3 回連続規則の対応、採用しない理由、再検討条件を記録した。 |
| 11 skill の `SKILL.md` Gate 節（source + 昇格先） | 本家の reviewer 指定と Amadeus 側の写像を明記した。対象: rough-mockups、requirements-analysis、user-stories、refined-mockups、application-design、units-generation、functional-design、nfr-requirements、nfr-design、infrastructure-design、code-generation。 |
| `examples/skill-provenance.json` | 影響 entry の staleReason に #391 対応の追記を反映した。md5 は書き換えていない。 |

## #393 sensor と Learn の写像（完了）

PR #420（merge commit `d8c2609f`）の merge により Issue #393 は close された。

| ファイル | 変更内容 |
|---|---|
| `docs/amadeus/aidlc-v2-sensor-learn-mapping.md` | 新規作成。sensor 4 種（required-sections、upstream-coverage、linter、type-check）の stage 分布と Amadeus 側の検証先、Learn（memory.md 4 見出しと learnings ritual）の記録先、採用しない項目と理由、再検討条件を記録した。 |
| `docs/amadeus/lifecycle/overview.md` | 「v2 との構造差分」表へ reviewer、sensor、Learn の 3 行を追加し、lifecycle docs から写像を追跡できるようにした。 |
| 22 stage skill の `SKILL.md` Gate 節（source + 昇格先） | 当該 stage の sensor 宣言と Amadeus 側の写像を明記した。 |
| `examples/skill-provenance.json` | 影響 entry の staleReason に #393 対応の追記を反映した。md5 は書き換えていない。 |

## #392 Build and Test の失敗時処理（完了）

PR #421（merge commit `84f40dd1`）の merge により Issue #392 は close された。

| ファイル | 変更内容 |
|---|---|
| `docs/amadeus/aidlc-v2-build-and-test-failure-handling.md` | 新規作成。現行契約（halt-and-ask、修正は Code Generation 責務）を意図的差分として維持する判断、本家との対比、維持する理由、`build-test-results.md` の記録契約、Bolt gate との関係、再検討条件を記録した。 |
| `docs/amadeus/lifecycle/construction.md` | Stage 3.6 の Notes へ失敗時契約と理由を追記した。 |
| `docs/amadeus/lifecycle/overview.md` | 「v2 との構造差分」表へ Build and Test の失敗時処理の行を追加した。 |
| `skills/amadeus-construction-build-and-test/SKILL.md`（source + 昇格先） | 手順の halt-and-ask 段落の直後に、本家との意図的差分の注記を追加した。 |

## #394 Operation phase の対象外理由（実施済み）

| ファイル | 変更内容 |
|---|---|
| `docs/amadeus/aidlc-v2-operation-phase-boundary.md` | 新規作成。Operation phase を対象外にする理由を成果物契約、gate、validator、PR 境界の 4 観点で説明し、本家 Operation skill 7 件の一覧と Amadeus 側の扱い、将来対応の入口（専用 Issue 起票と Intake 経由の新 Intent）を記録した。 |
| `docs/amadeus/lifecycle/overview.md` | Phase 構成の Operation 段落へ理由の参照を追加し、「v2 との構造差分」表へ Operation phase の行を追加した。 |

## 対応した要求

| 要求 | 対応 |
|---|---|
| R003 | #391（PR #419）、#393（PR #420）、#392（PR #421）の完了証拠を記録した。#394 は本 PR で対応済みで、完了証拠は merge で確定する。 |
| R006 | 意味差分の明示（写像）を英語化と別 PR で行い、翻訳と意味変更の境界を維持した。 |

## 検証

各 Issue の PR で実行し、B005 の Build and Test で統括する。

## 未完了

- #394 の merge による完了証拠の確定。
- B005 の Build and Test の完了確定（PR merge 後に記録）。
