# Construction Traceability：Amadeus skill 英語化実施計画

## 要求から成果物と検証への対応

| 要求 | 設計 | 成果物 | 検証 |
|---|---|---|---|
| R001（#395、#400、#401、#402 の順序と依存関係） | `inception/units-generation/unit-of-work-dependency.md`、`inception/delivery-planning/bolt-plan.md` | B001、B002、B003、B004 の順に PR を作成し、各 PR を merge 済みにした。 | PR #409、#410、#411、#413 の merge。`aidlc-state.md` の Bolt Refs と Stage Progress。 |
| R002（子 Issue の完了証拠） | `inception/delivery-planning/external-dependency-map.md`、`ideation/decisions/D003-completion-evidence.md` | #395、#400、#401、#402 の各 close と対応 PR merge を audit に記録した。 | #395 closed at 2026-07-03T12:46:08Z。#400 closed at 2026-07-03T13:03:25Z。#401 closed at 2026-07-03T13:21:13Z。#402 closed at 2026-07-03T13:28:59Z。 |
| R003（#401 配下 Issue の扱い） | `docs/amadeus/aidlc-v2-difference-response-plan.md` | #391、#392、#393、#394 の対応順序、PR 境界、#402 との衝突回避を定義した。個別完了または対象外判断は B005 以降の残タスクとして扱う。 | PR #411 merge。Issue #401 close。#391、#392、#393、#394 は 2026-07-03T13:59:22Z 時点で open。 |
| R004（skill 英語化 PR の境界） | `docs/amadeus/skill-language-policy.md`、`inception/practices-discovery/team-practices.md` | 代表 skill の英語化土台、昇格フロー、検証コマンド、残り展開単位を定義した。 | PR #409、#410、#413 merge。`npm run test:it:promote-skill`、`npm run test:all`、Amadeus Validator。 |
| R005（親 Issue の完了判断） | `inception/requirements-analysis/requirements.md`、`construction/decisions.md` | #395、#400、#401、#402 の完了証拠だけでは #399 を閉じない判断に補正した。 | PR #414 は直接子 Issue の計画・追跡完了として merge 済み。PR #416 は取り下げ済み。Issue #399 は open。 |
| R006（全面英語化の追跡） | `docs/amadeus/skill-englishization-rollout-plan.md`、`inception/units-generation/unit-of-work.md`、`inception/delivery-planning/bolt-plan.md` | B005〜B010 を残タスクとして定義し、#391〜#394、RU002〜RU006、最終検証へ接続した。 | 2026-07-03T13:58:00Z 時点で Amadeus 系 `SKILL.md` 64 ファイルに日本語が残っている。 |

## 子 Issue 完了証拠

| 子 Issue | Bolt | 対応 PR | Merge commit | Issue 状態 |
|---|---|---|---|---|
| #395 | B001 | https://github.com/amadeus-dlc/amadeus/pull/409 | f519abea0ae677bdab7876868765ec020abf802e | CLOSED at 2026-07-03T12:46:08Z |
| #400 | B002 | https://github.com/amadeus-dlc/amadeus/pull/410 | 3618ff0c3de8659d83fae986455a52cbc064eb36 | CLOSED at 2026-07-03T13:03:25Z |
| #401 | B003 | https://github.com/amadeus-dlc/amadeus/pull/411 | eb18826209fe4e20e5deee0116310f30e379ba7c | CLOSED at 2026-07-03T13:21:13Z |
| #402 | B004 | https://github.com/amadeus-dlc/amadeus/pull/413 | b7475080143946e0ba634d119a4b5a308f7d669b | CLOSED at 2026-07-03T13:28:59Z |

## 残タスク

| 残タスク | Bolt | 完了条件 |
|---|---|---|
| #391、#393、#392、#394 の差分対応 | B005 | 各 Issue の完了、または明示的な対象外判断を確認できる。 |
| Core entrypoints and verification 英語化 | B006 | `amadeus`、`amadeus-steering`、`amadeus-validator` の source skill と昇格先 skill が英語化され、検証が pass している。 |
| Construction stage skills 英語化 | B007 | 残り Construction stage skill の source skill と昇格先 skill が英語化され、検証が pass している。 |
| Inception stage skills 英語化 | B008 | Inception stage skill の source skill と昇格先 skill が英語化され、検証が pass している。 |
| Ideation and supporting skills 英語化 | B009 | Ideation stage skill、補助分析、review 系 skill の source skill と昇格先 skill が英語化され、検証が pass している。 |
| #399 最終検証 | B010 | Amadeus 系 `SKILL.md` の全面英語化、昇格先同期、検証結果、Issue #399 の完了条件を確認できる。 |

## 最終判断

Issue #399 の直接子 Issue である #395、#400、#401、#402 の順序、依存関係、完了境界、完了状態は追跡可能になった。

ただし、Issue #399 の全面英語化は未完了である。

親 Issue #399 は、B005〜B010 が完了するまで完了扱いにしない。
