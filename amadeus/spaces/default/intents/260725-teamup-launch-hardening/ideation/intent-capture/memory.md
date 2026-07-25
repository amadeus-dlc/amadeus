<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
- 2026-07-25T10:45Z — #1476 と #1478 を1 intent の2ユニットとして扱う(ユーザー指示 = intent の小分けを避ける)。両者は team-up.sh 内で非交差の関数を触る(#1476 = CLAUDE_MONITOR_PROMPT と検証経路、#1478 = create_run)ため分割可能。Q1 裁定 A により出荷は Bolt ごとに2 PR とし、P1 の #1476 が P2 の #1478 の未検証事項に待たされない構成にした。
- 2026-07-25T10:45Z — 起草時実測で、CLAUDE_MONITOR_PROMPT(:104)が引数を持たない定数として4箇所(:861/:1094/:1202/:1211)から参照されることを確認。actas プロンプトは role を要する(spawn.sh:358 / main の codex_member_cmd)ため per-member 化が必要で、member 文脈を持たない :1094 のガードは書き換えを要する。これは intent-statement へ構造上の含意として明記した。
- 2026-07-25T10:45Z — ROLE_RESUME(:52)は :1018 で codex を第1引数に渡す codex 専用経路であり claude 経路からは参照されない。actas 移行の影響先候補から除外できる(ただし feasibility で再確認する)。
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
- 2026-07-25T10:40Z — スコープは amadeus-feature(18ステージ / Standard depth)を採用。#1476 は bug、#1478 は enhancement で変更種別が異なり、project.md Scope Overrides の bugfix 既定では #1478 を扱えないため。ユーザー指示により test-strategy のみ minimal へ下げた(前 intent と同じ運用)。
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
- 2026-07-25T10:45Z — Q2 で「actas 移行が不成立だった場合」の分岐を実測前に先決めした(裁定 B = 別 readiness 指標へ切替)。通常は実測後に決めるべきだが、feasibility の探索方向を定めるために先決めが有効と判断した。ただし発動条件は feasibility の実測結果であり、実測前に本案へ倒さないことを questions へ明記した。
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
- 2026-07-25T10:45Z — **最大のリスク**: actas 移行が成功すると verify_watchers_armed が実際に走るようになり、7つの Claude Code TUI のコールドスタート完了までブロックする構造が復活する。前 intent(PR #1477)が解消した 200秒問題を再導入しかねない。待機設計(非同期化 / タイムアウト / mux_attach 後への移動)を requirements で数値付きで確定する必要がある。intent-statement のリスク表へ記載済み。
- 2026-07-25T10:45Z — actas 排他ロック(watch.sh:185 actas_lock_state / :203 actas_lock_claim)が resume(-c)経路で前セッションのロックを保持していた場合の挙動が未検証。feasibility で resume シナリオを実測する。
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
