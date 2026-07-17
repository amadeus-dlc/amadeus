# RAID Log — codekb diff3 cleanup(Issue #1129)

上流入力(consumes 全数): `intent-statement.md`。

## Risks

| ID | Risk | Likelihood | Impact | Treatment / Evidence |
|---|---|---:|---:|---|
| R-01 | clean な現 HEAD だけを見て、修正 branch の着地追跡を省略する | Medium | Medium | commit `5e92d1516` の到達経路と main 着地状態を別々に検証 |
| R-02 | sentinel だけを確認し、旧「最新」ヘッダ断片を見落とす | Low | Medium | sentinel 0件と最新ヘッダ各1件を対で計測 |
| R-03 | main 着地前に Issue を close する | Low | Medium | `close-after-landing-verification` を exit condition に固定 |
| R-04 | 採用済み diff3 marker 語彙を再度 persist し、ノルムを重複させる | Low | Low | §13 surface を既存CIDと照合し、重複候補を0件にする |

## Assumptions

| ID | Assumption | Validation | If False |
|---|---|---|---|
| A-01 | `origin/fix/1027-state-set-fail-closed` が修正 commit を保持する | `git branch -r --contains 5e92d1516` | 修正 object の新しい到達可能 ref を特定する |
| A-02 | origin/main は対象 sentinel を含まない | main ref に対する全数走査 | main 汚染として優先度と修正経路を再評価する |
| A-03 | 履歴本文は削除対象ではない | commit diff が marker / header の4行削除のみ | 変更を止め、Issue scope とデータ整合性を再確認する |

## Issues

| ID | Issue | Status | Owner | Resolution Condition |
|---|---|---|---|---|
| I-01 | 修正 commit は観測した origin/main `f58b8bbd33d4f5f1ae169c81278c827697730b48` の祖先ではない(exit 1) | Open | leader | record-sync / main 着地状態を ref 付きで確認 |
| I-02 | Issue #1129 は OPEN | Expected | leader | main 着地後の sentinel 0件・最新ヘッダ各1件を確認して close |

## Dependencies

| ID | Dependency | Type | Owner | Evidence |
|---|---|---|---|---|
| D-01 | intent record の Ideation 完了と park | Internal | conductor | phase verification と park state |
| D-02 | record-sync 経路の準備 | Internal | leader | landing 対象 ref / branch |
| D-03 | main 取り込みの人間承認 | Governance | user / leader | approval provenance と着地状態 |
| D-04 | 着地後の main 再計測 | Verification | leader / reviewer | ref 付き件数出力 |

## RAID Review Decision

release-blocking な技術・AWS・compliance issue はない。Open item はすべて着地順序と検証 provenance に関するもので、Ideation の park を妨げない。ただし I-01 / I-02 は下流の record-sync と Issue close 前に必ず解消する。
