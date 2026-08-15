# Business Logic Model — unit presence-closure(U6 / C13 / FR-12 / D7・D8)

## 現状(as-is)の患部

### D7: `approve-batch` は presence 無検証

`amadeus-bolt.ts` の `handleApproveBatch`(:1226-1274)は現在:
1. `--batch <n>` の数値妥当性検証(:1228-1232)
2. `withAuditLock` の中で state を読み、当該バッチが承認済みなら no-op で早期 return(:1237-1241)
3. `Swarm Gated Batch Approvals` フィールドへ追記する `updated` を計算(:1243-1249)
4. `GATE_APPROVED` を emit(:1253-1261)
5. state を書く(:1263)

このどこにも「実在する人間がこの操作を行ったか」の検証がない。`amadeus-bolt.ts:1200-1203` のコメントが「semi の gated バッチ境界は1バッチにつき1ゲート」と述べる**人間ゲート**であるにもかかわらず、AI エージェントがこのサブコマンドを叩けば無条件に承認記録が残る(D7 の実測根拠、RFC 付録 C)。

### D8: ゲート presence 検査の active-scope fail-open

`amadeus-lib.ts` の `scanPresenceLedger`(:3766-3811)は監査シャードが 1 件も存在しない(または全シャードが空)とき `null` を返す。呼び出し元 `humanActedSinceGate`(:3877-3899)はこれを次のように扱う:

```
const events = scanPresenceLedger(projectDir, intent, space);
if (events === null) return intent === undefined; // fail open (active/legacy) / fail closed (named record)
```

`intent` が明示されない呼出し(アクティブ/レガシースコープ)では `events === null` のとき `true`(presence あり)を返す — ledger が存在しないことが「presence 検証を素通りさせる」方向に効く、これが D8 の fail-open。この分岐に到達する呼出し元は 3 箇所(いずれも `amadeus-state.ts`、本 unit は編集しない — functional-design-questions.md Q4):
- `assertHumanPresentForGateResolution`(:3691-3739、`humanActedSinceGate(pd, verb, intent, space)` を :3731 で呼ぶ — G25)
- `handleDelegateApproval`(:4581、`humanActedSinceGate(pd)` を verb-less・intent 省略で呼ぶ — G26)
- `handleDelegateRejection`(:4670、同様 — G27)

## 処理フロー(to-be)

### D7 是正: `verifyBatchApprovalPresence`

```
handleApproveBatch(args):
  1. --batch の数値妥当性検証(既存、変更なし)
  2. pd = resolveBoltProjectDir(...)
  3. withAuditLock(pd, () => {
       3a. presence = verifyBatchApprovalPresence(pd)   // NEW — ロック内側の最初の操作、状態読取・冪等判定より前
           if (presence is Refusal):
             error(presence.reason)   // ロック保持のまま即終了。state 未読・監査未発行のまま非0 exit
       3b. 以降は既存フロー(state 読取 → 冪等判定 → RMW → GATE_APPROVED emit → state 書込)を同一ロック内で継続
     })
```

`verifyBatchApprovalPresence(projectDir): Result<PresenceReceipt, PresenceRefusal>` は `amadeus-lib.ts` に置き、内部で `humanActedSinceGate(projectDir)`(verb 省略の一般述語 — Q1)を呼ぶ。拒否時は `PresenceRefusal { reason }` を返し、`amadeus-bolt.ts` 側がこれを既存の `error()` ヘルパーへ渡して loud fail する。presence の実測(監査シャード読取)は `withAuditLock` の**内側**、state の読取・RMW・`GATE_APPROVED` emit と**同一のロック区間**で行う(ロック取得より前で検証を済ませない — Q2)。これにより presence を検証した時点と `GATE_APPROVED` を記録する時点の間に別プロセスが同じ `HUMAN_TURN` を別のゲート解決で消費してしまう TOCTOU 競合を構造的に排除する。監査シャードの読取コストは小さく、既存の `withAuditLock` 区間(:1216-1219 のコメントが述べる「read->decide->emit->write section runs under withAuditLock」)へ presence の read->decide をそのまま合流させるだけなので、ロック保持時間の増分は無視できる。

### D8 是正: `resolveGatePresence`

`scanPresenceLedger` の呼出し側で ledger-absent を fail-closed に統一する新関数を挟む:

```
resolveGatePresence(scan: PresenceEvent[] | null, /* 既存の一般判定に必要な引数 */): PresenceVerdict
  if scan === null:
    return { present: false, reason: "ledger-absent" }   // scope を問わず一律(Q3)
  else:
    return { present: humanActOutstanding(...) ? true : false, reason: ... }
```

`humanActedSinceGate` は内部で `scanPresenceLedger` の結果をこの関数へ通してから真偽値へ写像する形に改修する(公開シグネチャ `humanActedSinceGate(pd, verb?, intent?, space?): boolean` は不変 — G25/G26/G27 の呼出し元コードは無改修で新しい判定を継承する。Q4)。

## 統合シーム

- **← U5(semi-authority-projection)への段依存**: unit-of-work-dependency.md「U6 blockedBy U5 — C13 は allowsOccurrence 系、U5 が書き換える同一 interaction 面の新意味論に対して実装する」。U6 は U5 が確定させた `allowsOccurrence` の新しい semi 権限区分(phase-boundary/WS のみ人間)を前提に presence 検証を組む — ただし D7/D8 自体の検証ロジックは U5 の権限区分と独立(presence は「本当に人間が動いたか」の検証であり、「その occurrence が人間ゲートかどうか」の判定は C5/U5 の責務)
- **← 直列化のみ(依存ではない)**: `amadeus-bolt.ts` を共有する U1/U8/U11 とはファイル面の直列化制約のみ(delivery-planning で Bolt 順序として固定)。presence-closure 自体のロジックはこれらと機能的に独立
- **→ services.md / component-dependency.md の同期**: unit-of-work.md「§12a iteration-2 FOLLOW-UP の引受: services.md の C13 補記と依存行列への C13 行列追加は U6 実装時の設計文書同期で行う」— コード変更と同じ変更列で application-design 側の当該2成果物を更新する(本 unit の実装時タスク。functional-design の対象外だが申し送りとして明記)

## エラーパス

| 事象 | 扱い | 根拠 |
|---|---|---|
| `approve-batch` を presence なしで呼ぶ | `verifyBatchApprovalPresence` が拒否 → `error()`(ロック保持のまま)→ state 未編集・監査未発行のまま非0 exit | D7 是正、`amadeus-bolt.ts:1213` の既存契約(検証→発行の順序)を presence にも適用 |
| `approve-batch` を presence ありで呼ぶが当該バッチは既承認 | presence はロック内側で通過し、既存の冪等ショートカット(:1238-1241)がそのまま no-op で応答 | Q2 — presence は「ロック内側・状態読取より先」、冪等判定はその後の既存ロジックのまま |
| ゲート解決時に ledger が丸ごと不在(フレッシュクローン等) | `resolveGatePresence` が `{ present: false, reason: "ledger-absent" }` → `humanActedSinceGate` が `false` → 呼出し元(G25/G26/G27)は presence なしとして扱い拒否 | D8 是正。無退行ペア: 実 `HUMAN_TURN` がシャードに存在する正当経路は引き続き `present: true` |
| named record を明示指定したゲート presence 検査 | 既に fail-closed だった挙動を維持(結果は不変。根拠が「scope 特例」から「一般規則」へ移るのみ) | Q3、component-methods.md C13 |

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-15T17:31:07Z
- **Iteration:** 1
- **Scope decision:** none

presence-closure(U6/C13/FR-12)は引用現況性・境界規律とも良好だが、presence 検証を withAuditLock の内側/外側どちらに置くかで承認済み Q2 回答と business-logic-model.md が直接矛盾しており business-rules.md も未解消。

### Findings

- BLOCKER | functional-design-questions.md Q2 / business-logic-model.md / business-rules.md R-2 | ロック境界の自己矛盾 — 承認済み Q2 回答は「`--batch` 数値検証の直後・`withAuditLock` に**入った直後**(内側)・状態読取や冪等判定より前」に presence を検証すると明記するが、business-logic-model.md の処理フローは `verifyBatchApprovalPresence(pd)` を「NEW — `withAuditLock` **の外**」と明記し、ロックへ入る前(4番目の手順として初めて withAuditLock に入る)に検証を完了させている。business-rules.md R-2 も「`withAuditLock` に入る前(あるいはその最初の操作として)」と両論併記のまま解消していない。presence 検証中にロックを保持するか否かは並行性・実装契約に直結する事実であり、code-generation が3成果物のどれを正本として実装するかで挙動が割れる。単一の権威ある配置(内側 or 外側)へ収斂させ、他の2成果物を訂正する必要がある

### 是正(BLOCKER 解消)

functional-design-questions.md Q2 / business-logic-model.md「D7 是正」処理フロー・エラーパス表 / business-rules.md R-2 の3成果物を**ロック内側**(`withAuditLock` の内側、コールバックの最初の操作として presence を検証し、state 読取・冪等判定・RMW・`GATE_APPROVED` emit と同一の排他区間に置く)へ統一した。根拠: presence の実測(監査シャード読取)と `GATE_APPROVED` の記録を同一ロック区間に収めることで、検証時点と記録時点の間に別プロセスが同じ `HUMAN_TURN` を消費してしまう TOCTOU 競合を構造的に排除できる。読取コストは小さくロック保持時間の増分は無視できるため、既存の `withAuditLock` 区間へ presence の read->decide をそのまま合流させる設計とした(2026-08-16)。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-15T17:52:46Z
- **Iteration:** 2
- **Scope decision:** none

presence-closure(U6/C13/FR-12)のロック境界矛盾は解消 — Q2/business-logic-model.md/business-rules.md R-2の3成果物が withAuditLock 内側(コールバック最初の操作)へTOCTOU根拠付きで収斂し、他の業務規則・引用に退行なし。

### Findings

- None
