# Business Logic Model — U4 clean-env-e2e

> 上流入力(consumes 全数): unit-of-work(U4 定義)、unit-of-work-story-map(FR-6 トレース)、requirements(FR-6a〜6c)、components(C6)、component-methods(C6 ケース表)、services(外部サービス境界 — fake 対象の定義)

## クリーン環境の合成(FR-6a)

tests/e2e/ の serial テスト(既存 t-tui 系 serial・setup-install e2e の temp 環境合成様式を踏襲):

1. **temp HOME**: `mkdtemp` で隔離 HOME を作成(実 `~/.agents` に触れない)
2. **隔離 PATH**: fake herdr / fake agmsg send.sh のみを含む bin ディレクトリを PATH 先頭へ(実バイナリ遮断)
3. **self-install ツリー**: 配布コピー(dist/claude/.claude 相当)を temp ワークスペースへ展開(setup-install e2e の既習様式)— 被検体は必ず配布コピー(no-canonical-direct-execution)

## fake seam(FR-6b)

- fake herdr: t-team-msg.test.ts:23-52 の fakeHerdr 様式(temp bin に shim を chmod 0755 で書き、verb を env 分岐、呼び出しログを HERDR_ACTION_LOG 形式で観測、unknown verb exit 2)
- fake agmsg: send.sh shim(受信引数をログへ記録し exit 0)。AGMSG_ROOT を temp 側へ向ける(既存 env override 契約の再利用 — 本番コードに テスト分岐を作らない)
- 実バイナリでの完走はドッグフード環境の検証記録として record に補完する。出典 = AD decisions.md ADR-4(本ステージ consumes 宣言外のため正本直読 2026-07-23、Decision 行 verbatim「fake herdr/agmsg(既習 fakeHerdr 様式)+temp HOME+self-install ツリー合成で Must 面を決定的に検証。実 herdr/agmsg での完走はドッグフード環境で実施し record へ記録(FR-6b)」)。**記録の owner = build-and-test ステージの conductor(保存先 = <record>/construction/build-and-test/ の検証記録)** — 起動者不在の安全網にしない(guard-activator 同型リスクの回避)

## テストフロー(component-methods C6 ケース表の実装形)

| ケース | 手順 | assert |
|---|---|---|
| happy path | team-up.sh 起動 → メッセージ送信(team-msg.sh)→ 選挙 open→vote→tally | fake ログの verb 呼び出し列(workspace create / pane / send)+選挙 store の tally 成立(elections/<id>/tally.json 実在) |
| herdr 不在 | PATH から fake herdr を除外して起動 | exit 1+stderr に "herdr"+入手先案内 |
| agmsg 不在 | AGMSG_ROOT を不在パスへ | exit 1+stderr に "agmsg" |
| 非対応 OS | uname スタブ(PATH 先頭の fake uname) | exit 1+非対応メッセージ |
| doctor advisory | 不在構成で /amadeus --doctor 相当を配布コピーから実行 | 出力に advisory 行+exit code は既存意味論のまま |

## 到達確認(FR-6c)

エラー経路(不在3分岐)は lcov DA で実到達を確認(cid:build-and-test:error-path-reach-lcov — 別経路が同じ exit 1 に到達する偽 green を排除)。bash 面は coverage 対象外のため、doctor(TS)側の分岐 DA+bash 側は stderr 文言 assert(ツール名の包含)で経路を弁別する。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T03:29:43Z
- **Iteration:** 1
- **Scope decision:** none

Major1(ADR-4 の consumes 宣言外引用 — AD 段と同型再発)+Minor3件(実バイナリ記録の owner 不在/R-2 引用の意味論不明瞭/PATH bare 呼び出し前提の実装時再確認申し送り)。FR-6 全数カバー・ケース表1:1・隔離設計・DA 到達設計は良好

### Findings

- Major1: ADR-4 引用を正本直読 verbatim へ是正
- Minor1: 実バイナリ検証記録の owner(担当ステージ・保存先)を明記
- Minor2: R-2 は raid-log R-2(herdr 互換)であることを明確化(constraint-register R-2 とのラベル衝突解消)
- Minor3: PATH bare 呼び出し前提の実装時再確認を申し送り

## 実装時再確認の申し送り

- 隔離の完全性は「team-up.sh / team-msg.sh / 選挙 transport が herdr / agmsg send.sh を PATH・env override 経由で解決する」前提に立つ — build-and-test 実装時に bare 呼び出し/override 経路であることを実ソース grep で再確認する(enumeration-reverify-at-implementation)

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T03:31:24Z
- **Iteration:** 2
- **Scope decision:** none

iter1 の4指摘全閉包(ADR-4 正本直読 verbatim 化・owner 明記・R-2 ラベル分離・実装時再確認申し送り)。是正 diff に捏造・無申告逸脱なし。frontmatter consumes 実測で宣言外申告の正確性も裏取り

### Findings

- None
