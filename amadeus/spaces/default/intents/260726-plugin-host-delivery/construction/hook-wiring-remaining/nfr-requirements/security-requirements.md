# セキュリティ要件 — U4 hook-wiring-remaining

> 上流入力(consumes 全数): business-logic-model、business-rules、requirements、technology-stack

## 脅威モデルと境界

U4 はセッションライフサイクルのフックから compose 入口を起動する配線であり、`technology-stack.md` 実測の各ハーネスフック環境(Claude Code hook、Codex `.codex/hooks.json`、Kimi `~/.kimi-code/config.toml` の managed block 等)へ 1 点の HookInvocation を追加する。セキュリティ上の要点は、**フックに合成・判定ロジックを置かない**こと(攻撃面と保守面の両方の縮小)と、**フック起動失敗がセッションを壊さない**ことである。

## SEC-U4-1: フックにロジックを置かない(BR-U4-1)

`business-rules.md` BR-U4-1 と `requirements.md` FR-3b「フックは compose 入口を呼ぶだけ」のとおり、各面の配線はフック側への HookInvocation 追加 1 点のみとし、合成・判定ロジックをフック側へ複製しない。これによりフック配布物が独自の信頼判定・path 解決を持たず、既存 engine の trust 境界(`business-logic-model.md` フロー 1 の「compose 入口」= `scripts/plugin-composition.ts` の既存機構)へ委譲する。

- 合否: フック diff は HookInvocation 1 点のみで、合成ロジック・trust 判定・path 解決の再実装を含まない(diff の行数・内容検分)
- 合否: CLI 経由(手動床)の compose 結果とフック経由(自動)の compose 結果が同一(engine 直呼びテストとの一致 — `business-rules.md` BR-U4-1 検証、独自合成が無いことの実証)

## SEC-U4-2: 失敗時継続(BR-U4-5、fail-safe)

`business-rules.md` BR-U4-5 と `business-logic-model.md` フロー 2/3 のとおり、フック起動失敗は stderr 1 行警告+セッション継続とする(U2 HookInvocation.failureMode の逐語継承)。これはフックの障害がユーザーのセッション起動自体を DoS 的に阻害しないための fail-safe 契約である。

- 合否: compose 失敗 fixture でセッション起動が成功し、警告が出力される(`business-logic-model.md` フロー 2/3 検証)。失敗をサイレントに握り潰さず、かつセッションを止めない両立

## SEC-U4-3: 認可・監査面の維持(NFR-1)

`requirements.md` NFR-1 のとおり、trust grant・監査整合は現行水準を下回らない。U4 の配線はフックから既存 compose 入口を呼ぶだけで、認可判定・監査発行の新経路を作らない。project.md Mandated の認可テスト群(directive contract / state transition / audit invariant / race / team-mode regression / harness drift)で退行を検証する。

- 合否: U4 の配線変更が認可テスト群を退行させない(フックが独自の認可判定を持たないことの帰結 — SEC-U4-1 と連動)

## 非該当カテゴリ(N/A + 根拠)

- 認証情報の保持 / secret 管理: N/A。フックは compose 入口を argument-array で起動するのみで credential を扱わない(technology-stack.md 実測、既存フック環境の資格情報は各ホストの credential store に委譲)
- 入力サニタイズ(ネットワーク): N/A。フックはセッションライフサイクルイベントで起動され、外部ネットワーク入力を消費しない
