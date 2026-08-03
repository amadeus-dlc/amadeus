# Reliability Requirements — execution-observability-baseline

上流入力（consumes 全数）: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`

## Durability と Correctness SLO

常駐serviceではないため、時間稼働率のSLAではなく、`requirements.md` NFR-01／02、`business-logic-model.md` のaudit-first lifecycle、`business-rules.md` BR-EO-07〜15、`technology-stack.md` の短命CLI特性に基づく処理単位SLOを採用する。

| ID | SLO／Invariant | Target | Failure behavior |
|---|---|---|---|
| RL-EO-01 | canonical-before-effect | native開始の100%がvalid StartPermitを持つ | canonical／必須projection receipt欠落時は開始0件、`projection-blocked`で安全停止 |
| RL-EO-02 | identity consistency | root／parent／operation／attempt参照整合100%、orphan 0件、cycle 0件 | 不整合eventをcommitせずtyped conflictを返す |
| RL-EO-03 | exactly-once lifecycle | begin／finish／projectionの重複commit 0件 | 同一key同一fingerprintは既存receipt、異fingerprintはfail-closed |
| RL-EO-04 | crash recovery | reserved／claimed／dispatch-confirmed／terminalの全4状態で決定的な復旧結果 | no-effect-confirmed以外のclaimed不明状態は再dispatchせず安全停止 |
| RL-EO-05 | canonical RPO | commit成功済みcanonical eventの許容損失0件 | projection障害でもauditを巻き戻さない |
| RL-EO-06 | projection recovery | state/runtimeはauditから1回のrebuildで同じevent-set digestへ収束 | rebuild後に同じrequestでStartPermitを再評価し、重複native開始0件 |
| RL-EO-07 | telemetry degradation | OTel unavailable／dropでworkflow失敗への昇格0件 | drop reasonを残し、canonical outcomeを変更しない |
| RL-EO-08 | baseline usability | 20測定runの各manifestがtotal statusを持つ | `invalid` runをcontrolへ採用せず原因を機械可読に残す |

## Fault Tolerance と Recovery

- canonical write failureへ同じ失敗journalを使って再帰的にerrorを書かない。callerへ`persisted:false`を返し、native side effect前に停止する。
- `claimed`後のcrashではnative effect queryを `no-effect-confirmed | effect-possible | unknown` へ正規化する。`no-effect-confirmed`だけが後続Unitの有界retry候補である。
- `dispatch-confirmed`後は同じnative handleのresult collectionを再開し、worker／toolを再dispatchしない。
- state/runtime projection failureは`pending-rebuild`として保持する。rebuildはcanonical auditだけを入力にし、OTelを復旧の正本にしない。
- compact／process再起動／session resumeは同じ非terminal rootを再取得する。Redo／reject後revision／terminal後再実行だけがsupersedes付き新rootを作る。

## Verification Matrix

- fake clock、fake audit writer、fault-injectable projection sink、fake native effect queryを公開test seamとする。
- crash pointはcanonical commit前、commit後／projection前、projection途中、permit後／dispatch前、native受付後／confirm前、finish後／reply前を網羅する。
- availability全variant、wall逆行、時刻片側欠落、duplicate finish、terminal後attempt、child非terminalのroot完了をnegative testへ固定する。
- deterministic coreと全影響adapter conformanceをblockingにし、live provider／CLIの未提供は`unavailable` expected resultとして扱う。
- package/self-install後にも同じfixturesを通し、生成物と正本のschema driftを0件にする。
