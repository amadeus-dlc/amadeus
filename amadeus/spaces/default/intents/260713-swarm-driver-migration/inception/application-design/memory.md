## Interpretations

- 2026-07-13T08:47:50Z — engineのeligibility責務とstateless refereeの収束責務を維持する。Application Designでは両者の間にあるdriver選択・起動・証跡境界だけを設計対象とする。
- 2026-07-13T08:47:50Z — AWS resourceとGUIは対象外である。AWS視点は新規cloud依存がないこと、Design視点はCLIの選択・警告・error表示契約へ限定して適用する。
- 2026-07-13T09:21:03Z — 共通driver toolをengineとrefereeの間に置き、native実行はtool、Claude/Kiroを含む既存floor実行はconductorへ返す機械可読planで扱う。共通toolから呼べないharness-native floorを無理にprocess化しない。
- 2026-07-13T09:21:03Z — `codex-ultra`は架空の`--ultra` flagではなく、実行modelのUltra reasoning受理、batch単位の単一`codex exec --json` coordinator、明示的multi-agent有効化、SubagentStart/Stop相関をすべて満たすAmadeus実行契約として定義する。
- 2026-07-13T09:37:07Z — 第1回独立レビューを受け、native証跡を独立sourceのAND、全Unit-child全単射、全childのcompleted stop、execution/attempt/nonce/plan/wave digest相関へ強化した。
- 2026-07-13T09:37:07Z — C-01とC-11は互いに直接依存させず、conductorがversioned referee envelopeを仲介する。terminal successはfinalize invocation、worktree manifest、Unit merge前後commit、result digestまで一致した場合だけ確定する。
- 2026-07-14T08:57:56Z — Requirements FR-11はAgent Teamsのnative proofを要求するが、non-interactive transportは要求していない。Code Generation入口の実機証拠に基づき、Agent Teamsをinteractive PTY、Ultra Codeをheadless stdio JSONへ分離しても上流要件とbatch coordinator決定は維持される。
- 2026-07-14T09:08:08Z — 再実行Iteration 1の独立レビューで、PTY終了トリガーとevent-bound capture bindingが公開契約へ接続されていないことを確認した。live control signalとaudit-first self-edgeを追加し、runtimeへprovider固有parserを漏らさない。
- 2026-07-14T09:14:42Z — 最終Iteration 2でfixed-path initial bindingとcapture kindの型閉包不足が判明した。fixed/event-bound/hook-onlyのplan・binding・checkpointをdiscriminated unionへ揃え、storeがprovider名やargvを解析せず許可edgeを検証できるようにした。

## Deviations

- 2026-07-13T09:21:03Z — 新しい常駐serviceやAWS mappingは生成しない。対象がlocal CLI orchestrationであり、追加serviceは要求・既存architecture・セキュリティ制約に反するため、`services.md`では短命processのservice lifecycleを設計した。
- 2026-07-14T08:57:56Z — Code Generation入口で承認済みの`claude -p`共通transport前提が反証されたため、recovery protocolに従いApplication Designへ戻った。production codeを作らず、下流成果物を再生成する。

## Tradeoffs

- 2026-07-13T08:47:50Z — 5つの設計判断に質問を限定する。Requirements Analysisで確定済みの公開値、platform、legacy互換、fallback規則は再質問しない。
- 2026-07-13T09:21:03Z — native証跡はprovider stateとmachine-readable stream/hookの相関を必須にした。version/effort/env設定だけより実装・live fixture負担は増えるが、4 driverのfalse successを防ぐ要求を優先した。
- 2026-07-13T09:21:03Z — checkpointとauditは単一file transactionにせず、既存のaudit-first lock、transition ID、pre/post digest、idempotent resumeでcrash windowを収束させる。
- 2026-07-13T09:37:07Z — Kiro waveは単純な4件chunkではなく2〜4件のbalanced分割とした。実装は少し増えるが、5件時の4+1を避けて全waveでnative child 2件以上の証跡契約を維持する。
- 2026-07-13T09:37:07Z — 再開状態をfailed-resumableとfailed-terminalへ分離した。check/finalize/merge失敗は要求どおり再開可能とし、入力不正や決定的policy違反だけを終端失敗にする。
- 2026-07-13T09:44:11Z — 第2回独立レビューでhard crash時のactive checkpoint回収不足が判明した。固定lease、process start identity、旧process group確認、fencing tokenを追加し、生存ownerと停止ownerを区別してsplit-brainを防ぐ。
- 2026-07-13T09:44:11Z — reviewer反復上限は2回でNOT-READYだったため追加レビューは行わず、全残件を設計へ反映して機械検証結果と未取得の独立READYをgateで明示する。
- 2026-07-14T08:57:56Z — Agent TeamsだけにPTYを導入し、Ultra/Codex/Kiroのheadless transportは維持する。共通runtimeには`stdio-json | pty-interactive`の閉じたvariantとcapture lifecycleだけを追加し、既存`node-pty` 1.1.0を再利用してprovider条件分岐や新dependencyを増やさない。
- 2026-07-14T09:08:08Z — PTYのlive完了判定を最終verifierと分離した。adapterの`ready-for-graceful-exit`は終了制御だけに使い、terminal後のretained evidenceで同じ条件を再検証するため二段階になるが、循環待ちとpartial evidenceのsuccess化を防げる。

## Open questions

- 2026-07-13T08:47:50Z — selector所有、native process topology、preflightとruntime evidenceの分離、crash checkpoint、正規化eventと監査所有を確定する。
- 2026-07-13T09:21:03Z — 設計上のblockerは解消した。Claude Ultra Code、Codex Subagent hooks、Kiro parent-child sessionの具体的field pathは最初のimplementation research fixtureでversion pinし、取得不能なら同名driverを成功扱いせずscopeへ戻る。
- 2026-07-14T08:57:56Z — Ultra Codeのexact provider-state blockerは解消した。Agent Teamsのinteractive PTY上のexact team/task/hook schemaは下流再生成後のCode Generation入口live fixtureで確定し、取得不能なら再びparkする。
