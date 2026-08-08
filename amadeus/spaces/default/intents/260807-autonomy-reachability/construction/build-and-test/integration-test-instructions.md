# Integration Test Instructions — autonomy-reachability(#2378)

上流入力(consumes 全数): 6 unit の `code-generation-plan.md`(検証の設計)と `code-summary.md`(追加した integration テストと実測) — u1-autonomy-core / u2-birth-declaration / u3-question-route-observability / u4-conduit-parity / u5-measurement-report / u6-plugin-docs-drift。

## 本 intent の integration テスト

| テスト | unit | 何を固定するか |
|---|---|---|
| `tests/integration/t481-*.integration.test.ts` | u1 | state の canonical な書込経路。BR-U1-1 の grep ガード(投影が1経路に留まること)と、**audit commit 失敗時の挙動注入** |
| `tests/integration/t482-autonomy-refusal-event.integration.test.ts` | u1 | 「なぜ autonomy が裁定に至らなかったか」を記録する refusal イベントの発行。記録の失敗はゲートを変えない(fail-open)ことも固定 |
| `tests/integration/t488-*` / `t489-*` | u3 | `QUESTION_ANSWERED` の `Resolution Route` / `Decision Id` 派生属性と、route 別集計・bypass 検出 |
| `tests/integration/t490-*` / `t491-*` | u2 | birth 同時宣言の受理と拒否(既に人間が設定済みなら上書き不可、`full` は儀式へ誘導して停止、carry の宙吊り拒否)、launch chain の human turn 束縛 |
| `tests/integration/t492-autonomy-conduit-parity.integration.test.ts` | u4 | 導線パリティ。ハーネス集合を `readdirSync` で導出し、各入口が `--autonomy` を記載していること。help text は `dist/claude/.claude/tools/amadeus-utility.ts help` を spawn して出力面で観測 |

## 落ちる実証(新設ガードの必須要件)

新設のゲート・検証スクリプト・チェックは、失敗ケースを注入して**実際に赤くなることを実証**してから完成扱いにする(org.md Mandated)。本 intent では以下を実施した。

**1セットで不可分に行う**(`cid:code-generation:falling-proof-injection-one-set`) — 注入 → 赤の実測 → 復元 → 残渣ゼロの機械確認。復元は `git checkout <fix コミット SHA> -- <path>` で行い、`stash` を使わない(`cid:code-generation:falling-proof-no-stash` — bare stash は無関係変更まで巻き取り、未コミット時は修正自体を失う)。

**注入面は「テストが実際に読む面」へ**(`cid:code-generation:injection-surface-verify`) — 正本と生成物のどちらを対象テストが読むかを注入前に実測確認する。また**実行時に消費される行**へ注入する(`cid:code-generation:inject-runtime-consumed-lines`) — 型 union や型注釈のみの変更は TypeScript の runtime 消去により赤くならず、注入が効いたと錯覚する偽陰性を作る。

t492 の実証記録: builder が `opencode/commands/amadeus.md` で1セット、conductor が独立に `kimi/skills/amadeus/SKILL.md` で1セット。後者は注入後 `4 pass 1 fail` で**赤が `harness:kimi` を名指し**(どの面が欠けたか出力から特定できる)、復元後 `5 pass / 0 fail`、repo 全域の注入トークン grep 0 hit。

## 実行時の注意

- **並行 fan-out 直後にフルスイートを回さない** — 入れ子 spawn 型テストは外側並列と重なるとタイムアウト予算を食い切り、負荷起因の偽赤を生む(`cid:code-generation:fanout-load-settle-before-integration`)。本 intent でも `gen-coverage-registry` の 30s タイムアウトが負荷起因で1回発生し、再実行で green になった
- **エラー経路テストの green は lcov の DA で到達を実測確認**してから完成扱いにする(`cid:build-and-test:error-path-reach-lcov`) — 別経路が同じ exit code に到達する偽経路 green は assertion だけでは見えない
- **spawn を伴うテストを追加したら mechanism ratchet の再分類**を確認する — t492 は `none→cli` と再分類され `EXPECTED_NONE_TO_CLI` への登録を要求した。**対象テストだけを流しても発見できないゲート**であり、全 CI まで回して初めて赤になる
