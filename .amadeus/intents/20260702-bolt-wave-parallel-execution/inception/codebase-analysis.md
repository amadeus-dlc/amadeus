# 既存コード分析

## 対象コード

| 対象 | 種別 | 確認内容 |
|---|---|---|
| `skills/amadeus-construction/SKILL.md` | 公開入口 skill | 「Construction 全体を進める場合は、5つの内部 skill を上から順に使う」という直列前提の契約を持つ。`内部プロセス`（97 行付近）と `入力`（対象 Bolt の解決）が wave 契約の追加位置になる。実行順序の判断は親 skill の責務（プロセスの順序を決め、内部 skill を呼び出す）である。 |
| `skills/amadeus-construction-bolt-preparation/SKILL.md` | 内部 skill | `ready_for_approval` へ到達したら停止して人間の承認を待つ契約を持つ。Bolt ごとのゲートであり、wave 内の複数 Bolt をまとめて承認する運用と両立する（ゲート契約自体の変更は不要）。 |
| `inception/bolts.md` の構造契約 | 成果物契約 | `一覧` の `依存` 列と `依存関係` 表が必須構造であり、validator が検査する。wave の導出材料（依存グラフ）は既に機械可読である。 |
| `.amadeus/steering/policies/parallel-operation.md` | steering policy | worktree 分離での並行、同一 worktree での直列化、統合手順（追従、再生成、検証）、承認運用（キュー確認、まとめ承認）を判断基準として持つ。wave 実行の運用前提が policy 化済みである。 |
| `.amadeus/intents/20260702-shared-index-generation/**` | 先例 | B002 と B003 が「B001 の後に並行実行可能」な依存構造だったが直列実行した実例。同 Intent の Construction 判断 D003 が B002 と B003 の Task Generation をまとめ承認した先例でもある。 |
| `state.json` の `construction` ブロック | 状態契約 | `targetBolts` と `bolts[].taskGeneration` は Bolt 単位であり、wave はどの Bolt を先に扱うかの順序判断であって新しい状態フィールドを要求しない。 |

## 既存能力

- `bolts.md` の依存表が必須構造として確定しており、wave（依存がすべて前の wave までに完了した Bolt の集合）をトポロジカルレベルとして決定論的に導出できる。
- 並行実行の運用前提（worktree 分離、直列化、統合手順、まとめ承認）が並行運用ポリシーとして確定済みで、skill 契約はこれらの運用と整合する形で書ける。
- Task Generation Gate の契約（`ready_for_approval` 停止、承認 evidence）が確定済みで、wave 内の複数 Bolt のまとめ承認は既存契約の運用（20260702-shared-index-generation の Construction 判断 D003 の先例）として成立する。

## 統合点

- `amadeus-construction` の `内部プロセス` に、複数 Bolt を扱う場合の wave 導出と実行順序の契約を追加できる（G001 確定判断）。
- `入力`（対象 Bolt の解決）に、wave 単位の対象 Bolt 指定の扱いを追加できる。
- 内部 skill の契約（bolt-preparation の停止、implementation-execution の前提）は変更せず、親 skill の orchestration だけで wave を表現できる。
- skill は配布物のため、workspace 固有の policy へ固定参照せず、「対象 workspace の steering policy（並行運用の判断基準）がある場合はそれに従う」一般形で参照できる。

## ギャップ

- 依存のない Bolt 同士でも直列実行する前提が skill 本文に明記されており、wave 単位の並行実行を許可する契約がない。
- wave の導出規則（依存表からのトポロジカルレベル導出）が定義されていない。
- wave 実行時の worktree 分離、wave 完了時の統合と検証、次の wave への進行条件が skill から読めない。
- wave 内の複数 Bolt の Task Generation をまとめて `ready_for_approval` にし、まとめ承認する運用が skill から読めない（先例はあるが契約化されていない）。

## リスク

- skill 変更 PR になるため、レビュー支援契約（挙動差分要約、skill-forge 確認、粒度制約）と promote 同期の適用対象になる。
- wave 並行の実行自体は複数 worktree と複数エージェントを要するため、契約定義後の実運用検証はこの Intent の範囲では skill 記述の整合確認に留まる（実運用の観察は後続の学習候補）。
- 公開入口の契約変更は e2e eval（mock）の期待出力に影響する可能性があり、`test:e2e:construction:*` の確認が必要である。

## Inception への入力

- 要求は、wave 導出の契約、wave 単位の実行と統合と検証の手順、まとめ承認の運用、既存の直列前提との関係（wave を使わない場合は従来どおり直列）、に分けられる。
- Unit は、wave 実行契約の単一の価値境界にまとめる構成が候補になる（導出、実行、統合、承認は同じ契約を共有する）。
- Bolt は、(1) `amadeus-construction` SKILL.md への wave 契約の定義と promote 同期、(2) 関連する検証（e2e eval の非破壊確認、skill-forge 確認）、の分割が候補。文書変更が中心のため 1 Bolt + 検証内包も候補になる。
- Construction では skill 変更 PR としてレビュー支援契約が適用される。

## 証拠

| 種別 | 参照 | 内容 |
|---|---|---|
| file | `skills/amadeus-construction/SKILL.md` | 「5つの内部 skill を上から順に使う」直列前提と、内部プロセス、入力（対象 Bolt 解決）の確認。 |
| file | `skills/amadeus-construction-bolt-preparation/SKILL.md` | `ready_for_approval` 停止契約の確認。 |
| file | `.amadeus/steering/policies/parallel-operation.md` | worktree 分離、直列化、統合手順、まとめ承認の判断基準の確認。 |
| file | `.amadeus/intents/20260702-shared-index-generation/construction/decisions/D003-b002-b003-task-generation-approval.md` | 複数 Bolt のまとめ承認の先例確認。 |
| file | `.amadeus/intents/20260702-shared-index-generation/inception/bolts.md` | 並行可能な依存構造（B002、B003）の実例確認。 |

## 鮮度

| 項目 | 値 |
|---|---|
| analyzedCommit | 5b104caa |
| analyzedAt | 2026-07-02T22:56+09:00 |
| freshness | current |

## 未確認事項

- wave 契約の文言と挿入位置（`内部プロセス` 内の章立て）は Construction Functional Design で確定する。
- e2e eval（mock）の期待出力への影響の有無は Construction で確認する。
- wave 導出の機械化（解析スクリプトの同梱）はこの Intent では扱わず、運用実績を見て後続候補とする。
