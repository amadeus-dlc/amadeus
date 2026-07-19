# Components — election-ts-foundation

> 上流入力(consumes 全数): requirements.md、architecture.md、component-inventory.md、team-practices.md

## 構成(scripts 分離 — U-01=B 裁定 2026-07-19)

| # | コンポーネント | 責務 | 対応 FR | 推定規模(実装+テスト) |
|---|---|---|---|---|
| C1 | election-model(型+純関数コア) | 選挙定義・票・開票結果の判別ユニオン型、GoA 集計純関数、決定的シャッフル(シード=選挙ID+投票者)、票検証(fail-closed) | FR-1b/1c, FR-3a/3b, FR-4, NFR-3 | 250-350 行 |
| C2 | election-store(記録 I/O) | `amadeus/spaces/<space>/elections/<選挙ID>/` の読み書き(定義・配布ビュー・票実体化・開票結果・タイムライン)。U-03=A | FR-1a, FR-3d, FR-5b | 150-220 行 |
| C3 | election-render(記録生成) | 票タイムライン・GoA 度数行(parseGoaLine byte 互換)・persist 文素案の生成 | FR-5a, C-08 | 120-180 行 |
| C4 | election-verify(照合) | 留保転記件数照合・票数照合・時系列単調性の self-check+外部文書検査 | FR-6 | 100-150 行 |
| C5 | election-transport(輸送抽象) | VoterTransport インターフェース: agmsg 実装(team — send.sh spawn)/ subagent 実装(solo — 呼出側が票を還流)。短通知 payload 生成(FR-2 型保証) | FR-2, FR-7 | 120-180 行 |
| C6 | election CLI(指令エンジン面) | `next`/`report` 型の指令ループ(FR-0): open→distribute→collect→tally→record の状態機械。サブコマンド: open / notify / vote / status / tally / render / verify | FR-0, 全 FR の配線 | 200-280 行 |
| C7 | SKILL(contrib/skills/amadeus-election/) | 指令転送ループ+人間委譲のみの薄ラップ(禁止語彙 grep 対象) | FR-8 | 40-80 行(SKILL.md) |

**合算推定: 実装 980-1,440 行**(テストは別途 tests/ 側 — 当初概算 600-900 行は units-generation の per-unit 再算出で 910-1,340 行へ上方改訂済み。unit-of-work.md が正)。合算は各行の機械和(250+150+120+100+120+200+40=980 / 350+220+180+150+180+280+80=1,440)。

## 再利用棚卸し(reuse inventory — 読み側/書き側の対称 grep 実測済み)

| 既存資産 | 用途 | 不在確認(対称 grep) |
|---|---|---|
| `parseGoaLine`/`parsePmCidLine`(norm-metrics.ts:688/:704) | C3 の生成物の read 側対(byte 互換検証) | 書き側(GoA 行生成)は repo 内不在を grep 確認 — C3 が新設 |
| agmsg send.sh | C5 team 実装の輸送(spawn 実行のみ。component-inventory.md hooks/agmsg 節が列挙する delivery 設定系 writer — delivery.sh / hooks-json.sh — には触れない) | 選挙専用 wrapper は不在 — C5 が新設 |
| contrib overlay(promote-self.ts:45-46) | C7 の配置チャンネル(architecture.md contrib overlay 節に実測記録済み) | 実在・変更不要 |
| amadeus-orchestrate の next/report ループ様式 | C6 の構造写像元(component-inventory.md swarm 節: orchestrate = directive 発行 / swarm referee = 「stateless referee。AI dispatcher ではない」の分離実測を踏襲。architecture.md:32-40 invoke-swarm と同型の類推 — 直接の先例ではない) | 選挙用の状態機械は不在 — C6 が新設 |
| amadeus-mirror.ts の構成様式 | C2/C6 の実装写像元(state 読取・Result・exit code 契約) | — |
| 判別ユニオン Result(functional-domain-modeling-ts) | 全コンポーネント | project.md DECIDED 既決+team-practices.md(practices-discovery)の live Code Style 節と整合 |

新規機構の導入は C1〜C7 のみで、既存で代替可能なものはない(上表の不在確認による)。adapter・登録スロットの先行着地なし — C5 の subagent 実装も本 intent(将来の実装 intent)内で配線まで揃える(N3 準拠)。
