# 信頼性要件 — U2 walking-skeleton-claude

> 上流入力(consumes 全数): business-logic-model、business-rules、requirements、technology-stack

## アトミック性(途中失敗時の不変)

business-rules の BR-U2-5(アトミック)を継承する。business-logic-model のフロー 1 は `applyPluginPlan(atomic tx)` で合成を適用し、失敗時は runRecovery 経路へ落ちる。compose 途中失敗時に host bytes / composition record / audit が不変であることを、既存 t253 系の維持として担保する(移設後も同テストで固定 — BR-U2-1 の単一実装により engine の既存アトミック契約をそのまま継承)。

- 合否: compose 途中の任意段で失敗を注入しても、host bytes / composition record / audit が呼出前 bytes と一致する(BR-U2-5 / requirements FR-6 の安全合否)。落ちる実証として各段の失敗注入で不変性を実測する

## 回復性(recovery)と冪等再試行

business-logic-model のフロー 1 は失敗時に runRecovery 経路へ接続する。requirements NFR-1(アトミック commit/recovery)/ FR-6 のとおり、部分失敗後の再 compose は重複を生まず最新状態へ収束する。business-rules の BR-U2-2(冪等)がこれを支え、部分失敗 → 再試行が host を二重挿入・重複 fragment で汚染しないことを保証する。

- 合否: 部分失敗後の再 compose が冪等で、fragment 重複挿入なしに最新状態へ収束する(BR-U2-2 / BR-U2-5)
- 合否(recovery 可視): compose 途中失敗で journal が残存する状態は doctor で recovery-pending として可視化される(U5 doctor-observability の BR-U5-2b と対 — U2 は DropsRecord/composition record 側の書き手として不変性を保証)

## fail-closed とサイレント失敗の禁止

business-logic-model のフロー 1 は「失敗はどの段でも typed failure → stderr 1 行 loud → exit 1(サイレント失敗禁止 — construction.md Error Handling)」を規定する。business-rules の BR-U2-4(fail-closed CLI)のとおり、フック起動失敗は stderr 1 行警告+セッション継続とし、セッションをブロックしない一方、失敗を無音化しない。

- 合否: 各失敗段が typed failure を stderr 1 行で loud に出し、exit code で区別する。フック失敗はセッションを止めず警告 1 行を残す(BR-U2-4)

## dist 同期による drift 防止

business-rules の BR-U2-9(dist 同期)を継承する。移設・CLI 新設・フック配線の正本変更は同一変更で dist / self-install を再生成し、drift ガードを green に保つ(project.md Mandated)。technology-stack のとおり `bun scripts/package.ts` / `bun run promote:self` の再生成が正本と配布物の一致を担保し、配布面の不整合という信頼性リスクを決定的ガードで封じる。

- 合否: 正本変更と同一変更で `bun run dist:check` / `bun run promote:self:check` が green(BR-U2-9)
