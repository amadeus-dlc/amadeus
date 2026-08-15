# TLA+ Authoring — 適用性判定(terminal: not-applicable)

- 実施: 2026-08-15 / intent 260815-per-unit-outcome(self-fix)/ 断面 PR #3105 head `045ec60eb`
- 検査した識別子(全数): FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, FR-7(requirements.md)+ NFR 3 項(TDD / 監査 append-only / coverage 母集団)

## 判定基準への適合検査

基準: 「並行または再開可能なアクターが状態を共有し、かつ**無音のまま残りうる安全性違反**がある」主題のみ選定する。

| 主題候補 | 並行/再開性 | 無音違反の有無 | 判定 |
|---|---|---|---|
| per-unit outcome ledger(UNIT_OUTCOME_SETTLED の emit/read)| あり — `next` 再入(冪等鍵)+ swarm CLI と append-only shard を共有 | **なし** — 全違反様式が loud: 行欠落→`producer-outcome-pending`(fail-closed throw)、重複→`producer-outcome-ambiguous`、形状破れ(Stage/join 鍵/語彙)→`invalid-unit-outcome-audit-row`。冪等・pool 優先 de-dup は決定的な read-time fold で相互排除不変量を持たない | 非選定 |
| 幅1 batch dispatch 分岐(amadeus-lib.ts:8416)| 単一プロセス決定的分岐 | なし(本 intent は不変更 — RFC-0001 域)| 非選定 |
| FR-5 回復手順 | 人間手順文書 | 対象外 | 非選定 |
| FR-6 台帳同期 | CI ゲートが loud に検査 | なし | 非選定 |

## 登録済みモデルとの照合

model-map 登録 4 モデル(BoltPrAttestationGate / FormalElection / MirrorLifecycle / PrConvergenceGate)はいずれも per-unit consume fanout / unit outcome ledger を主題に含まない。本変更の orchestrate.ts 実装ハッシュピンは `updateModelMap --impl-only` で resync 済み(モデル・cfg 無変更 = 到達可能挙動のモデル化範囲に変更なし、impl-only)。

## 結論

選定主題 0 件 — **not-applicable(terminal)**。将来この判定を覆す条件: (1) settle の emit を複数プロセスが並行実行しうる構造(例: swarm と per-unit の同時進行)が導入され、read-time fold でなく書込時の相互排除が必要になった場合 (2) cancelled 系の記録経路追加(#3106)が pool との合流プロトコルを持つ設計になった場合。
