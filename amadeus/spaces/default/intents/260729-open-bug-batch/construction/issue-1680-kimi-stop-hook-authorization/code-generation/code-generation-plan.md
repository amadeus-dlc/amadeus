# Issue #1680 コード生成計画

## 正本とスコープ

- 正本は Issue #1680 と、conductor から受領した承認済み FR-1680-1〜4 とする。
- `amadeus-bugfix` として、Kimi の Stop hook、reviewer の tool 境界、gate response provenance に限定して修正する。
- Issue #1607、#1681 の completion／mirror 境界は変更しない。
- 同一OSユーザー内での汎用的なruntime role認証は、本Boltでは実現可能な境界がないため Issue #1700 へ分離する。

## 要求トレーサビリティ

| 要求 | 実装境界 | 検証 seam |
|---|---|---|
| FR-1680-1 | Kimi Stop はcaller形状にかかわらず観測専用のno-opとし、stateful core hookへ転送しない | Kimi adapter の stdin、spawn回数、exit code、stdout／stderr |
| FR-1680-2 | 実際にdispatchされるreviewer profileだけをread-only tool allowlistへ制限し、engine／stateを呼ぶBashを実行前に拒否する | Kimi向けagent frontmatter生成物、reviewer／workerの役割差 |
| FR-1680-3 | 既存 targeted presence reservation を stage gate に適用し、対象 Intent／stage／session の HUMAN_TURN だけで承認する | reservation、`STAGE_AWAITING_APPROVAL`、`GATE_APPROVED` の provenance |
| FR-1680-4 | reviewer READY、pending directive、subagent Stop、recovered gate-start を一続きで再現する | Kimi adapter＋engine＋state の integration |

## 最小設計

1. Kimi外部hookのStop payloadには信頼できるmain／subagent識別子がないため、adapterのStop routeは常に空にする。
2. Kimi公式custom-agentの `tools` allowlistを、dispatch対象のproduct lead／architecture reviewerへだけ投影する。`Read`、`Grep`、`Glob`のみを許可し、Bashを含めない。
   この機構が導入されたKimi Code CLI 0.29.0をハードフロアとし、0.28.xはdoctorで拒否する。
3. developer／architect／composerは役割上Bashが必要なため制限しない。`support_agents`はinline読込、built-in `explore`はKimi側でread-onlyのため追加profileを生成しない。
4. gate 回答には既存presence reservation carrierを使う。Kimi skillはgate提示前の予約と、回答後のcarrier付きreportを行う。AskUserQuestionの `tool_input` または番号付きproseの回答に同一reservation IDが含まれる場合だけmintする。
5. SessionStartが記録する `.current-session` はgate provenanceの相関にだけ使い、一般的なcaller認証とは位置づけない。
6. reservation作成はworkspace lockとintent lockの順に直列化し、競合時は同一carrierへ収束させる。recovered gate-startは予約ownerのIntent／spaceを明示指定し、cursor切替後も別Intentを変更しない。別質問・別stage・別IntentのHUMAN_TURNを受理しない。
7. Request Changesはcarrier付き `gate-reject` で同一owner lock内にrejectとreservation消費を記録する。修正後の `gate-reserve` はrevising gateを再提示し、新しいreservation IDだけを有効にする。

## TDD 手順

1. main／subagentの両Stop形状がcore forwarding hookを呼ばないRed → 常時no-op。
2. reviewerのengine／state Bashがtool allowlistに存在しないRed → Kimi固有frontmatter投影。
3. §13／通常質問の HUMAN_TURN を gate に流用できない Red → targeted reservation。
4. reviewer READY＋pending directive＋recovered gate の統合 Red → main conductor の明示承認だけを Green にする。
5. cursor A→B競合、standing grant fallback、AskUserQuestion payload、Request Changes→再提示をRed化し、owner state／auditと新carrierだけが変化するGreenにする。
6. canonical から package／promote を生成し、Kimi face と全配布面の drift を検証する。

## 完了条件

- FR-1680-1〜4 のRed証跡とGreen証跡を残す。
- runtime role認証の残課題と Issue #1700 への分離をPR要約に明記する。
- 関連 test、typecheck、lint、complexity gate が成功する。
- `bun scripts/package.ts --check` と `bun run promote:self:check` が成功する。
- VCS操作はユーザーの明示依頼に従い、1 Bolt＝1 PRとしてConventional Commit、push、PR作成まで行う。
