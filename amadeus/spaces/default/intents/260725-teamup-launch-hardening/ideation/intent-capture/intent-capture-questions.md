# Intent Capture — Questions（260725-teamup-launch-hardening / Issue #1476, #1478）

## E-OC1 選挙不要判定

判定: **選挙不要（ソロモード）**。根拠種別 = 運用形態。`AMADEUS_OPERATING_MODE` は未設定でありソロモード（team.md § Operating Modes）。未決の設計判断はユーザーへエスカレーションして裁定を得る。

leader 承認: 2026-07-25T10:40Z — ユーザーが conductor へ直接指示。以下の裁定はユーザー直接裁定（AskUserQuestion 経由）による。

## 実測した前提（起草時点、測定 ref: HEAD `c4c9531ee`）

- `CLAUDE_MONITOR_PROMPT`（`team-up.sh:104`）は**引数を持たない定数**で、4箇所から参照される: `:861`（`claude_member_cmd` の `init_prompt`）、`:1094`（適用可否ガードの `case`）、`:1202`（再送）、`:1211`（回復ガイダンス）。
- actas プロンプトは `/agmsg actas <role>` の形で **role を要する**（`spawn.sh:358` verbatim: `ACTAS_PROMPT="${CMD_PREFIX}${CMD_NAME} actas ${NAME}"`、main の `codex_member_cmd` は `prompt="\$agmsg actas $role"`）。role は `member_role()` が `leader` / `e1`〜`e6` を返す。
- したがって actas 移行は定数を**per-member 化**する構造変更を伴い、member 文脈を持たない `:1094` のガードは書き換えが必要になる。
- `ROLE_RESUME`（`:52`）は `:1018` で `codex` を第1引数に渡す **codex 専用**経路であり、claude 経路からは参照されない。
- actas は排他ロックを持つ（`watch.sh:185` `actas_lock_state` / `:203` `actas_lock_claim`）。同一 (team, role) を別セッションが保持している場合の挙動が resume 経路に影響しうる。

---

## Q1: #1476 と #1478 の出荷単位

両者は `team-up.sh` 内で非交差の関数を触る（#1476 = 初期プロンプトと検証経路、#1478 = `create_run`）。優先度は #1476 が P1/S2-CRITICAL、#1478 が P2。

- A. 2つの Bolt に分け、**ユニットごとに PR を出す**。#1476 が先に着地でき、#1478 の未検証事項（`.git` ロック競合）が長引いても P1 の修正が待たされない。
- B. 1つの PR にまとめる。レビューとマージが1回で済むが、どちらかの未検証事項が解決するまで両方が止まる。
- X. Other (please specify)

[Answer]: A（ユーザー直接裁定 2026-07-25T10:45Z、ソロモードにつき選挙なし）。2つの Bolt に分け、ユニットごとに PR を出す。採用理由: 両者は非交差の関数を触るため分割可能であり、#1476(P1/S2-CRITICAL) の着地が #1478(P2) の未検証事項（`.git` 設定ロック競合）の解決に待たされない。intent は1つのまま維持する。

---

## Q2: actas 移行が実現不能と判明した場合の分岐

feasibility で actas 移行が配送セマンティクス（`despawn.sh`、`team-msg.sh`、`session-end.sh`、resume 時の排他ロック）を壊すと判明する可能性がある。その場合の方針を先に決めておく。

- A. #1476 のスコープを「watcher arming 検証の**撤去**」へ切り替える。検証が機能しないことが確定した以上、到達不能コードを残さない。
- B. monitor モードでも観測可能な**別の readiness 指標**（`run/watch.<id>.pid` の出現など）へ検証対象を変更する。actas 移行を回避しつつ #1384 の保護を復活させる。
- C. #1476 を中断して Issue へ実測を記録し、本 intent は #1478 のみで完結させる。
- X. Other (please specify)

[Answer]: B（ユーザー直接裁定 2026-07-25T10:45Z、ソロモードにつき選挙なし）。actas 移行が配送セマンティクスを壊すと判明した場合は、monitor モードでも観測可能な別の readiness 指標（`run/watch.<id>.pid` の出現など）へ検証対象を変更する。採用理由: actas 移行のリスクを回避しつつ #1384 の保護を復活させられる。A（撤去）は #1384 の保護を放棄することになり、C（中断）は到達不能コード約120行を残したままにする。なお本分岐の発動条件は feasibility の実測結果であり、実測前に本案へ倒さない。

---

## Q3: 本 intent の完了条件

- A. #1476 と #1478 の両方が main へ着地し、実 launch で (i) watcher arming 検証が実際に成功する（sentinel が書かれる）、(ii) 起動時間が現行 5.87 秒から短縮される、の両方を実測できたとき。
- B. 上記に加えて、`t-team-up-watcher-arming.test.ts` が sentinel を自前で書く構造を解消し、agmsg の実挙動を検証する形になったとき。
- X. Other (please specify)

[Answer]: A（ユーザー直接裁定 2026-07-25T10:45Z、ソロモードにつき選挙なし）。両ユニットが main へ着地し、実 launch で (i) watcher arming 検証が実際に成功する（sentinel が書かれる）、(ii) 起動時間が現行 5.87 秒から短縮される、の両方を実測し、かつ `t-team-up-watcher-arming.test.ts` が sentinel を自前で書く構造を解消して agmsg の実挙動を検証する形になったとき。採用理由: テスト構造こそが #1449 の欠陥を2日間 CI で見逃した原因であり、これを残すと同型の再発を防げない。
