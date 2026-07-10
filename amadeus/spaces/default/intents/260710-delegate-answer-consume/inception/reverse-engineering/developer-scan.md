# Developer コードスキャン結果 — 260710-delegate-answer-consume (#736)

差分リフレッシュスキャン。ベース `24197d755` (前回スキャン, intent 260709-dynamic-test-size) → 現 HEAD `5e9040cda`。
正本は `packages/framework/core/tools/`。行番号はすべて core 側で確定(`.claude/tools/`・`.codex/tools/`・`dist/*` は生成コピーで手編集禁止)。

---

## 0. 差分サマリ(`git diff --name-status 24197d755..HEAD -- ':!amadeus/' ':!dist/'`)

フォーカス3ファイルは **すべて base→HEAD 間で改変済み**。この改変の実体は **#685(verb-scoped provenance + DELEGATED_REJECTION)** の実装で、#736 修正方式 B が要求する「verb スコープの足場」は **既に HEAD に存在する**。

| ファイル | 変更 | 実体 |
|---|---|---|
| `packages/framework/core/tools/amadeus-lib.ts` | +59/-45 | `humanActedSinceGate` に `verb?` 引数追加、`verifyDelegatedProvenance` を両 verb 共用化 |
| `packages/framework/core/tools/amadeus-state.ts` | +281 | `handleDelegateRejection` 追加、approve/reject が verb 付きで `humanActedSinceGate` を呼ぶ |
| `packages/framework/core/tools/amadeus-audit.ts` | +114 | `DELEGATED_REJECTION` を VALID_EVENT_TYPES に追加、CLI minting guard(presenceMintRejection) |
| `packages/framework/core/knowledge/amadeus-shared/audit-format.md` | +1 | `DELEGATED_REJECTION` レジストリ行追加 |
| `docs/reference/12-state-machine.md` / `.ja.md` | +1 | 同上ドキュメント行 |

注: **`packages/framework/core/tools/amadeus-log.ts` は base→HEAD で無改変**(Jul 9 のまま。answer コマンド経路は #685 で触られていない)。#736 の観測面のうち QUESTION_ANSWERED emit 側は無変更。

---

## 1. `amadeus-lib.ts` — 境界判定コア

### GATE_RESOLUTION_EVENTS(`amadeus-lib.ts:1506`)
```
const GATE_RESOLUTION_EVENTS = new Set(["GATE_APPROVED", "GATE_REJECTED", "QUESTION_ANSWERED"]);
```
QUESTION_ANSWERED は **gate resolution(非-human 境界イベント)** として扱われる。これが #736 の根源に直結: interview 応答が「resolution 境界」を進めてしまう。

### humanActedSinceGate(`amadeus-lib.ts:1507-1546`)
- シグネチャ: `humanActedSinceGate(projectDir, verb?: "approve" | "reject"): boolean`(1507-1510)
- ledger 空なら fail-open で `true`(1512)
- イベント分類ループ(1516-1531):
  - `HUMAN_TURN` → human(1518)
  - `DELEGATED_APPROVAL` は `verb !== "reject"` のときだけ検証、`DELEGATED_REJECTION` は `verb !== "approve"` のときだけ検証(1520-1524)。**verb 指定時は off-verb の委任を human でも resolution でもなく完全無視**。
  - それ以外の非-resolution/非-human はスキップ(1525)
- 時系列ソート(Timestamp→pos タイブレーク, 1532-1535)
- `lastHuman`/`lastResolution` を走査(1536-1543)し、`return lastHuman > lastResolution && lastHuman !== -1`(1544)
- **セマンティクス**: 「直前の resolution より後に human 行為があるか」。QUESTION_ANSWERED は resolution なので、HUMAN_TURN の後に QUESTION_ANSWERED が来ると `lastResolution > lastHuman` となり `false` を返す(= human 存在を消費)。

### verifyDelegatedProvenance(`amadeus-lib.ts:1585-1611`)
- 両 verb 共用の grounding 検証子。`Issuer Intent`/`Issuer Shard`/`Issuer Human Ts`/`Issuer Space` を読む(1586-1589)
- 欠損は即 `false`、path-shape ガード(`/^[A-Za-z0-9._-]+$/`・`..` 排除、`.md` leaf, 1591-1596)
- issuer shard を実読して該当 timestamp の HUMAN_TURN が物理的に存在するか照合(1597-1610)、なければ `false`(fail-closed)
- verb スコープ(どの verb を開けるか)は **呼び出し側の責務**で、この関数は grounding の真正性のみ証明(1553-1554 コメント)

### humanActedSinceLastAnswer(`amadeus-lib.ts:1615-1617`)
```
export function humanActedSinceLastAnswer(projectDir: string): boolean {
  return humanActedSinceGate(projectDir);  // thin alias, verb 無し
}
```
answer 経路用の薄い別名。**verb 無し呼び出し** = 両委任 type を human として数え、QUESTION_ANSWERED を resolution 境界として数える。

---

## 2. `amadeus-log.ts` — QUESTION_ANSWERED emit(base→HEAD 無変更)

`amadeus-log answer` の presence ガード(`amadeus-log.ts:121-148`):
- **autonomous carve-out FIRST**(130-132): Construction swarm/Bolt 応答は human 不要
- **off-switch**: `humanPresenceGuardDisabled()`(133)
- それ以外は `humanActedSinceLastAnswer` 相当のガード → 通れば `emitAudit(pd, "QUESTION_ANSWERED", fields)`(142)、`{ emitted: "QUESTION_ANSWERED" }` を出力(148)
- コメント(122-125): 「直前の QUESTION_ANSWERED が since 境界(consume-once, 1 human turn = 1 answer)」

**差分影響: なし(無変更)** だが #736 の症状発生源はこの emit が生む QUESTION_ANSWERED ブロックそのもの。

---

## 3. `amadeus-state.ts` — approve/reject/委任発行

### approve/reject 共通ガード assertHumanPresentForGateResolution(`amadeus-state.ts:1447-1471`)
- carve-out: `isAutonomousMode`(1453)→ `humanPresenceGuardDisabled`(1455)→ `!humanActedSinceGate(pd, verb)` で refuse(1456)
- **verb を forward**(1456)。approve/reject 両方が単一ヘルパー経由(#685 でドリフト解消)。DELEGATED_APPROVAL は approve のみ、DELEGATED_REJECTION は reject のみを開ける。

### 委任発行側 — handleDelegateApproval(`amadeus-state.ts:1607-1689`)
- **grounding gate(1625)**: `if (!humanPresenceGuardDisabled() && !humanActedSinceGate(pd))` — **verb 無し**でリーダー自身の ledger を検査。
- issuer 座標を組立て(issuerSpace/issuerIntent/issuerShard、1635-1650)、最新 HUMAN_TURN の timestamp を採る(1644-1650)
- DELEGATED_APPROVAL フィールドスキーマ(1668-1673): `Stage, Issuer Space, Issuer Intent, Issuer Shard, Issuer Human Ts (+ optional User Input)`。TARGET(conductor)intent の audit dir へ `appendAuditEntry("DELEGATED_APPROVAL", ...)`(1673)

### handleDelegateRejection(`amadeus-state.ts:1701-...`)
- approve のミラー。grounding gate も **verb 無し** `humanActedSinceGate(pd)`(1719)。フィールドは `Feedback` を持つ(User Input の代わり)。ディスパッチは `delegate-rejection`(state.ts subcommand 一覧 306 に登録)。

### ★ #736 に直結する観測(仮説ラベル)
**[仮説/根本原因候補]** 委任発行側 grounding(`state.ts:1625` および `:1719`)は **verb 無し** `humanActedSinceGate(pd)` を呼ぶため、リーダー ledger 上で `HUMAN_TURN → (interview に答えて) QUESTION_ANSWERED` の順になると、`lastResolution(QUESTION_ANSWERED) > lastHuman` となり **false → 委任発行を誤って拒否**する。すなわち QUESTION_ANSWERED が delegated-approval の grounding 用 human presence を「先食い」する。これが #736 の機構と整合(発行側での消費)。修正方式 B(verb-scoped provenance)の足場は既存だが、**QUESTION_ANSWERED を resolution 境界として数える点は verb スコープでは解けない**(QUESTION_ANSWERED は委任 type ではないため verb 引数の影響を受けない)。→ 修正は境界イベント集合または answer/delegate 経路の境界定義に触れる可能性が高い。**確定は architect の合成に委ねる。**

---

## 4. 既存テスト棚卸し

### t112-delegated-approval.test.ts(#671/#685 の pin)
- `verifyDelegatedProvenance` grounding 証明(78-159): 実 HUMAN_TURN で受理 / 不在 shard・timestamp 改竄・path-traversal・欠損フィールドを **fail-closed 拒否**
- `humanActedSinceGate` 委任 approve が conductor gate を開ける(160-200): 検証済み=human 扱い(179)、偽造=不可(198)
- **verb 壁(#685, 211-289)**: DELEGATED_APPROVAL は reject gate を開けない(250 `humanActedSinceGate(root,"reject")===false`)、逆も(269)。偽造 DELEGATED_REJECTION 拒否(288)
- `delegate-rejection` writer 発行ゲート(297-378): HUMAN_TURN 無しは発行拒否(355)、有りで発行(363)
- CLI minting guard(#685 review, 380-471): `append`/`append-raw` で保護イベントの mint を非零 exit で拒否
- **QUESTION_ANSWERED を委任 grounding と絡めるケースは無し** → #736 シナリオは未カバー(下記参照)

### t188-human-presence-gate.test.ts(境界セマンティクス)
- resolution 境界の順序契約(17 コメント)
- **handleAnswer twin(325-348)**: HUMAN_TURN 無しで answer 拒否(327-334)、HUMAN_TURN 有りで 1 answer commit → **同 turn 2 回目は QUESTION_ANSWERED が新境界となり refuse**(335-347)。**これは #736 の「QUESTION_ANSWERED が境界を進める」挙動を answer 経路で正に pin している** → 修正時にこの契約(1 answer/turn)と委任 grounding の両立が要点。

### その他
- t111.test.ts(111): QUESTION_ANSWERED を event 一覧に含む(taxonomy)
- t28-audit-event-sync.test.ts: 2 ファイル間の event-type SYNC 構造ドリフトガード(DELEGATED_REJECTION 追加で更新済み)
- t31/t81/t203/t91/e2e t-ide-kiro-checkpoint も presence 系に触れる(周辺)

### ★ カバレッジギャップ(実測)
`grep QUESTION_ANSWERED` を t112 に対して実行 → **ヒット 0**。委任発行側で「HUMAN_TURN 後に QUESTION_ANSWERED があると発行が誤拒否される」#736 の回帰テストは **現存しない**。修正では新規テスト追加が必要。

---

## 5. #685(verb-scoped provenance)言及 = 修正方式 B の既存足場

コード・docs に #685 の足場が **明示的に存在**:
- `amadeus-lib.ts:1499-1508`(verb scoping コメント)、`:1520-1524`(verb 分岐実装)
- `amadeus-state.ts:1443-1445`(approve/reject へ verb forward)、`:1691-1698`(reject ミラー)
- `amadeus-audit.ts:67-73`(DELEGATED_REJECTION 定義)、`:335/:353`(#685 review minting guard)
- `audit-format.md:79`、`docs/reference/12-state-machine.md:214`

→ 修正方式 B が verb スコープに乗るなら基盤は整備済み。ただし §3 の通り **QUESTION_ANSWERED の境界問題は verb 直交** — verb だけでは解けない点に注意。

---

## 6. dist 同期要件

3 ファイル(lib/state/audit)は生成コピーを `.claude/tools/`・`.codex/tools/` 両方に持つ(実測: 全 6 コピー存在)。core 改変時に必要:
- `bun scripts/package.ts`(dist 再生成)+ `bun run dist:check`(`package.json:11`)
- `bun run promote:self`(セルフインストール昇格)+ `bun run promote:self:check`(`package.json:12-13`)
- `bun run typecheck`(`:17`)/ `bun run lint`(`:18`, Biome — scope は `tests/` `packages/setup/`)
- audit event を触るなら **t28-audit-event-sync**(2 ファイル間の event taxonomy sync)を green 維持
- 3 ファイルは **同一コミットで core+dist+self-install を揃える**(team.md Mandated)

---

## 7. audit event 定義(docs)

`packages/framework/core/knowledge/amadeus-shared/audit-format.md`:
- `:78` DELEGATED_APPROVAL: フィールド `Timestamp, Stage, Issuer Space, Issuer Intent, Issuer Shard, Issuer Human Ts, User Input`、writer `delegate-approval`
- `:79` DELEGATED_REJECTION: verb-scoped mirror、フィールドは `Feedback`、writer `delegate-rejection`
- QUESTION_ANSWERED はレジストリの gate-resolution カテゴリに存在(t28 が sync 強制)

`docs/reference/12-state-machine.md:213-214` に同 2 event の state-machine 行(#671/#685)。

---

## 差分がフォーカス面へ与える影響(総括)

- **verb-scoped provenance(#685)は HEAD に既実装** — #736 修正方式 B の足場は完成済み。
- ただし **#736 の機構(QUESTION_ANSWERED が委任発行 grounding を先食い)は verb スコープと直交**: QUESTION_ANSWERED は委任 type ではなく `GATE_RESOLUTION_EVENTS`(lib.ts:1506)の resolution 要素として境界を進めるため、`state.ts:1625/:1719` の verb 無し `humanActedSinceGate(pd)` 呼び出しで消費される。[仮説] 修正は境界イベント定義 or answer/delegate 経路の境界セマンティクスに触れる。
- **回帰テスト未整備**(t112 に QUESTION_ANSWERED×委任 の交差ケース無し)。t188:335-347 が answer 側の 1-answer/turn 契約を pin しているため、修正はこの契約との両立が要件。
- `amadeus-log.ts` は無変更 — emit 側の改修は現時点で不要の可能性。
