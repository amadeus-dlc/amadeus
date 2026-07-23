# Application Design Questions — 260719-mirror-productization

> **処理方式**: 全3問は複数の妥当解を持つ設計判断であり選挙対象(cid:always-elect、P-02 は継続分に限り選挙方式へ改定済み — constraint-register 改定履歴)。裁定受領後にのみ [Answer] 記入(cid:election-answer-after-ruling)。decisions.md の裁定依存 ADR 結論欄は【裁定待ち】プレースホルダで先行起草(cid:ruling-dependent-placeholder)。既決(G-1〜7 / C-01〜08 / D-01〜08 / FR-1〜7 / E-MPRRA1〜3)は質問化しない。
> **選挙依頼**: 2026-07-23T01:50Z 頃 leader へ送信(E-code は leader 採番)

## Q1. mirror verb の実行主体制約(U-02)は?

- A. 制約なし — 現行 scripts 版と同一(誰のセッションからでも実行可)。書込面(state の Mirror Issue フィールド・gh)は verb 自体の fail-closed 検証(close の landing check 等)で防御し、実行主体では制御しない
- B. create/close は conductor(active intent の作業者)実行を前提とし、SKILL 本文に「create/close は conductor から実行」の運用注記を置く(機械強制はしない — ソロ/チーム両モードで成立する軽量制約)
- C. 機械強制 — 実行時に AMADEUS_OPERATING_MODE と実行者 identity を検査し、team モードでは conductor 以外の create/close を exit 1 で拒否
- X. Other (please specify)

判断点: 現行 mirror.ts に実行主体検査は存在しない(RE scan-notes (1) — 状態源は決定的ソースのみ)。C は新規の identity 判定機構(誰が conductor かの決定的判定源が現存しない)を要し規模増。B は運用注記のみで実装ゼロ。sync は一方向・冪等で主体制約の必要が薄い。

[Answer]: B — 運用注記(create/close は conductor から実行。機械強制なし)(E-MPRAD1 裁定 B、3-0 全票 GoA2。記入 2026-07-23T02:49:38Z、裁定受領後)

## Q2. 3層 config のファイル形式・置き場(U-03a)は?

- A. JSON 3面 — Global: `amadeus/config.json` / Space: `amadeus/spaces/<space>/config.json` / Intent: `<record>/config.json`。パーサは amadeus-settings.ts の fail-closed 様式(未知キー・型不整合を invalid 収集)を新モジュールで踏襲(既習様式の再利用最大)
- B. YAML 3面(可読性優先 — ただし既存 config 面に YAML パーサの前例なし、Bun-only で新規依存 or 手書きパーサが必要)
- C. Markdown フィールド形式(amadeus-state.md の getField/setOrInsertField 様式を再利用 — ただし「設定ファイル」として非標準)
- X. Other (please specify)

判断点: 既習は settings.json(JSON、SETTINGS_KNOWN_KEYS+fail-closed parse — amadeus-settings.ts:25-51)。G-6 は Global の置き場(amadeus/ 直下 git 共有)のみ既決で形式は design 委任。B は依存追加が Bun-only Forbidden と緊張。settings.json への相乗り(キー追加)は「既存設定の移行はしない」(W-01)とは別問題だが、settings は space 単層で Global/Intent 面を持たないため3層には新ファイルが必要。

[Answer]: A — JSON 3面(amadeus/config.json / spaces/<space>/config.json / <record>/config.json)、fail-closed 様式踏襲(E-MPRAD2 裁定 A、3-0。記入 2026-07-23T02:49:38Z、裁定受領後)

## Q3. SKILL の6ハーネス生成様式(U-03b)は?

- A. session skills 既習様式 — 正本 `packages/framework/core/skills/amadeus-mirror/SKILL.md` 1定義+`{{HARNESS_DIR}}` トークン置換で coreDirs 投影(amadeus-session-cost 等と同型、runner-gen 不使用)
- B. amadeus-runner-gen.ts 系へ統合(stage-runner 生成機構の拡張 — ただし mirror はステージではなく対象外の機構流用)
- C. ハーネス別に6面手書き(canonical 1定義原則に反する)
- X. Other (please specify)

判断点: RE scan-notes (3) — 既習の薄い runner は全て A 型(session skills、coreDirs 明示投影)。B の runner-gen は「コンパイル済みステージグラフから生成」する機構でありステージ外 SKILL への流用は意味論不適合(citation-semantics-check)。C は canonical 原則違反で保守面が6倍。

[Answer]: A — session skills 既習様式(正本1定義+{{HARNESS_DIR}} トークン置換、coreDirs 投影)(E-MPRAD3 裁定 A、3-0。記入 2026-07-23T02:49:38Z、裁定受領後)
