# Intent Statement

## Problem Statement

`AMADEUS_USE_SWARM` の旧 boolean 契約では、利用者が選んだ値と実際のディスパッチ方式の関係を、Claude と Codex の間で一貫して予測できない。特に Codex の既定経路が別プロセスの headless worker を使うため、Claude のセッション内サブエージェント実行と同型になっておらず、次の点が不明確になる。

- 同じ設定状態から各ハーネスでどのモードが選ばれるか
- 強化モードが同一セッション内で実際に利用されたか
- 他ハーネス専用値や不正値が指定されたとき、停止と降格のどちらが起きたか
- 選択結果と降格理由を監査証跡から再現できるか

中心課題は、多数の driver を一般化することではない。`unset`、`claude-ultra`、`codex-ultra` という三つの入力状態をハーネス相対で決定的に解釈し、Claude と Codex の通常経路をセッション内サブエージェント並列実行として揃えることである。

## Target Customer

最優先の対象者は、Claude または Codex で Amadeus の Construction を実行する利用者と、その実行基盤を保守する開発者である。

利用者は、通常時には追加設定なしで現在のセッション内にあるネイティブなサブエージェント並列実行を使いたい。強化モードを指定した場合は、そのハーネスで有効な方式が確実に選ばれ、利用できない指定が黙って別の成功扱いにならないことを必要としている。

第二の受益者は、Amadeus の conductor、監査、ハーネス文書、テストを保守する contributor である。環境変数、コード上の型、監査語彙が一対一になることで、選択ロジックの追跡と変更影響の確認が容易になる。

## Success Metrics

| 指標 | 完了条件 |
|---|---|
| 三モードの決定性 | `unset`、`claude-ultra`、`codex-ultra` と実行ハーネスの組み合わせについて、期待する選択・停止・降格が表形式で定義され、全ケースの自動テスト結果が一致する |
| 通常経路の同型性 | Claude と Codex の `unset` が、どちらも conductor と同じセッション内のネイティブサブエージェント並列 fan-out として実行され、別プロセス worker を開始しないことを証跡で確認できる |
| Codex 強化モードの実測 | Codex セッションで並列 spawn、結果回収、reasoning effort の指定をそれぞれ実測し、`codex-ultra` の成立を確認できる。不成立の面が一つでもあれば、代替へ黙って降格せず要求を再検討する |
| 不正値の fail-closed | 旧値 `1` を含む未知値の全テストで、ディスパッチ開始前に明示エラーとなり、後方互換シムや worker 起動が発生しない |
| 他ハーネス専用値の loud-degrade | Claude での `codex-ultra`、Codex での `claude-ultra` が通常経路へ降格し、全ケースで利用者表示と `SWARM_DEGRADED` 監査の双方に残る |
| 語彙の一対一性 | 環境変数の値、コード上の driver 型、監査イベントの driver 値が `subagent`、`claude-ultra`、`codex-ultra` で一致し、追加の写像層を持たない |
| レフェリー意味論の維持 | `prepare`、`check`、`finalize` の既存挙動を保護する回帰テストがすべて通り、変更は driver 語彙の必要最小限に留まる |
| 規模の可視化 | Units Generation で全 Unit に概算行数レンジが記録され、conductor の選択ロジックを中心とする小規模変更として承認される。数値上限を合否基準にはしない |
| 完結した着地 | adapter または契約だけを先行させず、必要な実装・配線・テスト・文書が同じ Intent 内で検証される |

## Initiative Trigger

[Issue #1157](https://github.com/amadeus-dlc/amadeus/issues/1157) の 2026-07-17 改訂と grilling により、三モードの語彙、ハーネス相対の意味、Codex 通常経路の置換、不正値と他ハーネス専用値の扱いが確定した。

旧 Intent の [PR #982](https://github.com/amadeus-dlc/amadeus/pull/982) は 25 ファイル・18,342 行まで拡大し、adapter が実利用経路へ配線されないまま閉じられた。この結果を繰り返さないため、旧 driver stack を継承せず、確定済みの選択契約だけを軽量に再始動する。

## Initial Scope Signal

- **Workflow scope**: `amadeus`
- **Initiative type**: Brownfield feature
- **Depth / test strategy**: Standard / Comprehensive
- **対象に含むもの**:
  - `AMADEUS_USE_SWARM` の三状態と、ハーネス相対の選択・停止・降格契約
  - Codex 通常経路をセッション内 native subagent 並列 fan-out として成立させるための実測と置換
  - `claude-ultra` と `codex-ultra` のハーネス内強化モード
  - `SWARM_DEGRADED` を含む利用者通知・監査語彙・テスト・必要文書の整合
  - Units Generation での Unit ごとの概算行数レンジ
- **対象に含まないもの**:
  - 汎用 driver stack、新たな adapter 階層、複数設定体系の追加
  - 旧値 `1` の互換シム
  - レフェリー三サブコマンドの意味論変更
  - Herdr や別のメッセージング基盤への接続
  - upstream のレフェリー設計そのものの変更

## Evidence and Assumptions

- 一次要求は [Issue #1157](https://github.com/amadeus-dlc/amadeus/issues/1157) と、この Intent の `intent-capture-questions.md` で確認された回答である。
- Intent の正本はこの record であり、[Mirror Issue #1182](https://github.com/amadeus-dlc/amadeus/issues/1182) は状態を一方向に反映するためのミラーである。
- Codex の subagent hook 配線は実現可能性の根拠候補だが、並列 spawn、結果回収、effort 指定の成立は後続ステージで実測するまで未確定とする。
- 旧 `260713-swarm-driver-migration` の成果物は過大化の対照証拠としてのみ扱い、その driver 構想や互換方針を本 Intent の要求へ復活させない。
