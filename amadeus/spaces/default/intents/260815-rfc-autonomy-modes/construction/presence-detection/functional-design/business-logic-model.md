# Business Logic Model — unit presence-detection(U2 / C3 / FR-2)

## 現状(as-is)の患部

- `amadeus-intent-autonomy.ts` は純粋な計算モジュールで、ファイル I/O を一切持たない(`node:fs` import なし。実測: `grep -n "readFileSync\|from \"node:fs\"" packages/framework/core/tools/amadeus-intent-autonomy.ts` 0 hit)。対話/非対話の実効判定を返す読取口が存在しない
- `hooks/amadeus-stop.ts:569` の `transcriptIsConversational(transcriptPath, format)` は Stop hook 時点限定・harness の transcript 形式依存の**補助信号**であり、RFC はこれを「現行位置に残す」(置換しない)と明記している。U2 の対象外(U4 の所有)
- 既存の類似実装として `amadeus-state.ts` の `handleDelegateApproval`(:4576-4608)/`handleDelegateRejection`(:4665-4696、行番号は本起草断面での実測)が、まさに「このセッション自身の監査シャードに `HUMAN_TURN` があるか」を次の手順で確認している:
  1. `auditShardDir(pd, issuerIntent, issuerSpace)`(`amadeus-lib.ts:4136`)でシャードディレクトリを解決
  2. `auditShardName(pd)`(`amadeus-lib.ts:4121`)でこのクローン固有のシャードファイル名(`<host>-<cloneId>.jsonl`)を解決
  3. `readFileSync(join(shardDir, issuerShard), "utf-8")` で読み、`findAllEvents(text, "HUMAN_TURN")`(`amadeus-lib.ts:6891`)で `HUMAN_TURN` イベントを抽出
  4. 1 件でもあれば「このセッションに実 HUMAN_TURN あり」と判定(未読/エラーは `catch` で握り「なし」側へ落とす — 既に fail-closed)

U2 はこの既存パターンを一般化した読取専用の公開関数として `amadeus-intent-autonomy.ts` に新設する(コンポーネント所在は ADR/components.md の指定どおり。実処理は `amadeus-lib.ts` の既存プリミティブを呼ぶだけの薄いラッパー)。

## 処理フロー

```
resolveSessionInteractivity(projectDir)
  1. shardDir = auditShardDir(projectDir)         // 「…/intents/<active>/audit/」。null なら 4 へ
  2. shardName = auditShardName(projectDir)        // このクローンの <host>-<cloneId>.jsonl
  3. text = readFileSync(join(shardDir, shardName), "utf-8")   // 失敗(ENOENT 含む)は例外を投げず 4 へ
     turns = findAllEvents(text, "HUMAN_TURN")
     interactive = turns.length > 0
  4. 例外/null 経路: interactive = false
  5. return { interactive, source: "human-turn-pipeline", measuredAt: new Date().toISOString() }
```

- **入力**: `projectDir`(このプロセスのワークスペースルート)。intent/space の明示指定は取らない — 判定対象は「今このプロセスが書いているセッション」固定であり、named record 越しの対話性は概念上存在しない(C13 のゲート presence とは別軸)
- **決定**: 「このクローンの監査シャードに `HUMAN_TURN` が 1 件以上あるか」の 2 値。中間状態(部分読取・古いイベントのみ等)は作らない — RFC が棄却した鮮度ウィンドウ(直近 N 分)を再導入しないための構造的な保証(Q1 初案の棄却理由そのもの)
- **出力**: `SessionInteractivity`(domain-entities.md 参照)。`source` フィールドは常に文字列リテラル `"human-turn-pipeline"` — 将来 harness 依存の headless 明示信号を追加する場合も、この関数の戻り値の意味論は変えず別関数(U4/Stop hook 側)で合成する

## 統合シーム(他 unit との境界)

- **→ U3(waiting-interruption)**: unit-of-work-dependency.md「U3 blockedBy U2(対話性判定が admission の前提)」。U3 の `enterWaiting`/`admitWaiting` は裁定順序 3(対話→人間 / 非対話→中断)の分岐に `resolveSessionInteractivity` の結果を直接消費する。U2 はこの型を安定させる責務のみを持ち、waiting の状態遷移そのものは U3 の設計
- **→ U4(interactive-carveout / Stop hook)**: 「U4 blockedBy U2(同一ソースの対話判定)」。Stop hook の carveout(質問/compose 保留でのターン返却可否)は `resolveSessionInteractivity` の `interactive` を直接分岐条件にし、`transcriptIsConversational` は補助信号として別途評価される(ADR-5)。U2 はこの2信号の合成方法を規定しない(U4 の設計)
- **→ U7(config-visibility / `--status`・statusline)**: 「U7 depends U2(`statusAutonomyFacet` が C3 実効判定を消費)」。`--status`/statusline は `resolveSessionInteractivity` の戻り値をそのまま表示に流す(FR-8 UI 真実性 — 表示値は実効判定関数と同一ソース)。U2 はこの表示整形を持たない
- **← 依存元なし**: unit-of-work-dependency.md は U2 の `blockedBy` を空(`[]`)と記録しており、U2 は他 unit の完成を待たずに単独実装・単独テスト可能

## エラーパス

| 事象 | 扱い | 根拠 |
|---|---|---|
| `auditShardDir` が `null`(record 未解決) | `interactive: false` | fail-closed(C3) |
| シャードファイル不在(ENOENT) | `interactive: false` | 既存 delegate-approval/rejection の `catch { fall through }` と同じ扱い |
| 読取権限エラー・破損 JSON 行 | `interactive: false`(例外を外へ伝播させない) | fail-closed。`findAllEvents`/`splitAuditRecords` は非 JSON 行を無音で除外する既存契約(`amadeus-lib.ts:6880-6888`)をそのまま利用 — 破損行がイベント数を過小評価する方向にのみ効き、過大評価(捏造)はしない |
| `HUMAN_TURN` イベントは存在するがタイムスタンプが壊れている | 判定に影響しない(件数のみ見る。タイムスタンプは使わない) | C3 は鮮度ウィンドウを持たない設計(Q3 初案の棄却) |

例外を握って `false` に落とす経路はすべて「呼び出し元を落とさない」ことが目的であり、値を偽装する目的ではない — 実際に `HUMAN_TURN` が存在するのに `false` を返すのは読取不能時のみで、存在しないのに `true` を返す経路は存在しない(過大評価不能な設計)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-15T17:31:07Z
- **Iteration:** 1
- **Scope decision:** none

presence-detection(U2/C3/FR-2)は裁定忠実性・境界規律・引用の現況性(auditShardDir:4121, auditShardName:4136, findAllEvents:6891, mintHumanPresence:607 いずれも実測一致)ともに良好で欠陥なし。

### Findings

- FOLLOW-UP | business-rules.md R-1 | 落ちる実証が「関数が存在しないため呼べない」という存在チェックのみに留まる — R-1 の主張(単一公開口であること)自体を検証する振る舞い(他の私設読取口が実装されていないことのコードレビュー確認)を明記すると R-5 相当の非実行検査と一貫性が取れる
