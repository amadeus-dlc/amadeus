# Business Rules — `semi-docs-revision` Functional Design(#2253)

上流入力(consumes 全数): unit-of-work.md, unit-of-work-story-map.md, requirements.md, components.md, component-methods.md, services.md

本 Unit(kind: spec)は実行可能な振る舞いを持たない文書改訂であり、本書の「ルール」は**改訂作業そのものを縛る決定規則**である。上流の依拠: Unit 境界と制約は `unit-of-work.md` §semi-docs-revision、FR 割当と「ゴールでないもの」は `unit-of-work-story-map.md`(FR-DOC-1/2 の主担当 + FR-LAD-6 記述面 + FR-ADV-5 記述面遵守)、改訂の実体要件は `requirements.md` 領域 H(FR-DOC-1/2)+ FR-LAD-5/6 + FR-ADV-5、対象集合の一括りは `components.md` C18、メソッド面が存在しないことは `component-methods.md` §C18(「メソッド面なし」)、サービス境界が存在しないことは `services.md` に C18 対応サービスが定義されていないことの確認による(本 Unit は非コードでありサービス化対象外 — 定義不在が正しい状態)。

測定 ref: worktree HEAD `5f6561eef6098209c4c29461ae0d7c6d070b5c01`。以下の行番号・件数はすべてこの断面の grep 出力からの転記。

---

## BR-1: grep 受け入れ基準の対象面は `docs/` に限定する

FR-DOC-1 受け入れ基準の逐語適用。「旧定義のまま述べる記述が 0 件」の検査対象は `docs/` 配下のみ。codekb(`amadeus/spaces/default/codekb/`)と intent record(`amadeus/spaces/default/intents/`)は旧定義を実測記録として恒久保持する**記録面**であり対象外(`cid:requirements-analysis:c1-ac-grep-surface-scope`)。`tests/` のピン改訂は本 Unit の所有ではない(FR-PIN-1 は `semi-authorization-core`、FR-PIN-2 は `stop-question-carveout` — `unit-of-work-story-map.md` §FR の割当)。

## BR-2: 日英対訳ペアは同一 PR で同期する

FR-DOC-1: 22 ファイル = 11 対訳ペア。片側だけの改訂を含む PR を発行しない。ペアの対応は basename(`<name>.md` ⇄ `<name>.ja.md`)で機械判定できる。改訂後、`git diff --name-only` に現れる docs ファイル集合はペア単位で閉じていること(片割れだけが現れたら違反)。

## BR-3: canonical 1 本のみを編集し、ミラーは再生成物として扱う

FR-DOC-2: `packages/framework/core/amadeus-common/protocols/stage-protocol.md`(canonical、`git ls-files` 追跡はこの 1 本のみ)だけを編集する。on-disk ミラー 14 本(self-install 5 + `dist/` 8 + canonical 1 — codekb `code-structure.md` 現在節の実測)は `bun run build` の再生成物であり、直接編集しない。`bun run build` 後に追跡ファイルが不変であること(C-5 / source-only 境界)。

## BR-4: 保存対象行は diff に現れてはならない

FR-LAD-5 / FR-DOC-2: `stage-protocol.md:105` と `:808`(walking skeleton は `none`/`semi` が人間待ち)は**保存**。本 Unit の PR diff にこの 2 行が現れたら違反。docs 側の保存対象(P 分類 12 行 — §BR-7)も同様に、意味論を変える改訂を加えない(周辺行の編集に伴う機械的な巻き込み変更も禁止)。

## BR-5: 禁止語彙 — 書いてはならない主張

1. **FR-LAD-6**: 「phase を完走する」「phase 1個ぶん必ず走る」「complete a phase / runs a whole phase unattended」に相当する走行単位の主張を、改訂後のどの docs / 正本知識にも書かない。本 intent の主張は「**質問で止まらない**」に限定する(`unit-of-work-story-map.md` §ゴールでないもの)。
2. **FR-ADV-5**: 「`run_required` 経路が plugin 非依存である」と読める記述を書かない。plugin 非依存性に言及する場合は「hold 判定の面に限る」の射程注記を併記する。
3. **BR-4 の裏面**: semi が walking skeleton / phase 境界 / Intent 終端を自動裁定できると読める記述を書かない(FR-LAD-5)。

## BR-6: `stage-protocol.md` 9 行の処遇表(FR-DOC-2 の行単位確定)

worktree 実測 `grep -n -i "semi" packages/framework/core/amadeus-common/protocols/stage-protocol.md` → 9 hit。requirements.md の引用行番号と全一致を確認済み(questions D2)。

| 行 | 現内容の要旨 | 処遇 | 改訂後に述べるべき内容(処遇 = 反転/同期のみ) |
| --- | --- | --- | --- |
| `:33` | 人間裁定を要するゲートの列挙(`none`、semi の phase 境界)と `autonomy_auto_approve` の conductor 手順 | **直接反転(改訂)** | 人間裁定の列挙は「`none` のゲート、および `semi` の**節目**(phase 境界・walking skeleton・Intent 終端)」へ改める。`autonomy_auto_approve` の手順記述は full 専用と読めない形にする(semi の認可済み裁定にも同じ監査由来の auto-approve 意味論が適用される) |
| `:105` | 最初の Bolt(walking skeleton)は `none`/`semi` が人間 | **保存** | — (diff 非出現。BR-4) |
| `:118` | mode 選択肢の label 行(`- label: semi`) | **表示文言** | label 行自体(`semi` の 3 値語彙)は不変。**隣接する description 行**が旧定義(「質問は人間」)を述べていれば新意味論へ改訂する(隣接行は token `semi` を含まないため grep 目録外 — BR-9 の実装時再走査で確定) |
| `:125` | mode の記録手順(`set-autonomy` / `preview-autonomy`) | **起動フラグ同期** | `--autonomy none\|semi\|full` 起動宣言を記録手段として追記。(a) 初回宣言(`modeProvenance.kind === "system-default"`)のみ受理 (b) `full` は grant 儀式必須・fail-closed (c) `set-autonomy` が正本経路 — の 3 点を保つ(FR-CLI-2/3/4。questions D5) |
| `:131` | **semi の正本 1 行定義**(phase 内 auto-approve / phase 境界は人間) | **直接反転(改訂)** | BR-8 の内容要素をすべて含む新 1 行定義へ置換 |
| `:133` | 品質不合格は承認でない(semi/full 共通) | **保存** | — (新意味論でも真) |
| `:442` | Bolt gate は `none/semi/full` に従う | **保存(参照のみ)** | — |
| `:796` | 用語集: legacy ladder prompt | **保存(参照のみ)** | — |
| `:808` | 用語集: walking skeleton は `none`/`semi` が人間待ち | **保存** | — (diff 非出現。BR-4) |

## BR-7: docs 64 行の R/P/U 全数分類(C18 ⚠ の解消実測)

`grep -rn "semi" docs/` → 64 行(en 32 + ja 32、22 ファイル)。判定述語は questions D1(「semi の下で質問が人間所有のまま残る」と主張する行 = R)。

### R(改訂)= 13 行(en 6 + ja 7)

| ファイル:行 | 旧定義の主張(要旨) |
| --- | --- |
| `docs/guide/glossary.md:17` | semi は「waits at phase boundaries **and questions**」 |
| `docs/guide/glossary.ja.md:39` | semi は「phase境界**と質問**を人間へ戻し」 |
| `docs/guide/02-your-first-workflow.md:167` | 選択肢説明「ask at phase boundaries **and questions**」 |
| `docs/guide/02-your-first-workflow.ja.md:169` | 同上(ja 側に en 文が残存) |
| `docs/reference/03-orchestrator.md:437` | 「phase boundaries **and questions** still wait for a human」 |
| `docs/reference/03-orchestrator.ja.md:437` | 「phase境界**と質問**は人間を待ちます」 |
| `docs/reference/06-hooks-and-tools.md:274` | 「`semi` remains **human-owned for questions** and therefore receives this carve-out」 |
| `docs/reference/06-hooks-and-tools.ja.md:257` | 「`semi`の質問は人間所有なので即座にstopを許可する」 |
| `docs/reference/06-hooks-and-tools.ja.md:272` | 「`semi`の質問は人間へ戻す」 |
| `docs/reference/04-stages/construction.md:46` | 「phase boundaries **and questions** wait」 |
| `docs/reference/04-stages/construction.ja.md:46` | 「phase境界**と質問**は人間を待つ」 |
| `docs/harness-engineering/08-construction-and-swarm.md:62` | 「waits at phase boundaries **and questions**」(:62-63 連続文) |
| `docs/harness-engineering/08-construction-and-swarm.ja.md:34` | 「phase境界**と質問**では人間を待ちます」 |

**R 行の改訂後に述べるべき内容**: BR-8 の内容要素(質問は full と同一の 5 段梯子で無人解決 / 節目は人間)と整合し、BR-5 の禁止語彙を含まないこと。stop hook 記述(`06-hooks-and-tools` の 2 ペア)は「質問 carve-out は full **と human-command 由来の semi** の下で抑制され、質問は無人解決される」へ反転する(FR-STOP-1 の `:422` 開放に対応)。

### 第2キー検出の追加改訂行(token `semi` 非含有)= 4 箇所

`cid:application-design:dual-key-consumer-inventory` の執行(questions D4)。いずれも FR-DOC-1 の 22 ファイル集合の内側:

| ファイル:行 | 現主張 | 処遇 |
| --- | --- | --- |
| `docs/reference/06-hooks-and-tools.md:48` | summary 表「the last two suppressed under autonomous Construction」 | 改訂: 質問タグ case は full + semi(human-command)で抑制 / 会話的 case は full 限定 — の分割記述へ(語彙も legacy「autonomous Construction」から mode 語彙へ同期) |
| `docs/reference/06-hooks-and-tools.md:259` | case 6「the last two are suppressed only under Intent autonomy `full`」 | 改訂: 同上の分割記述へ |
| `docs/reference/06-hooks-and-tools.ja.md:46` | summary 表「後の2つは自律的Constructionでは抑制される」 | 改訂: en `:48` と同期 |
| `docs/reference/06-hooks-and-tools.ja.md:257` | (R 表に計上済み — 分割記述は本表の規則に従う) | — |

**保存側の対**: en `:275` / ja `:273`(会話的ターンの carve-out は full 限定)は FR-STOP-1 が `:716` を full 限定のまま維持するため**改訂しない**。

### P(保存)= 12 行(en 6 + ja 6)— walking skeleton の人間待ち(FR-LAD-5)

`docs/guide/glossary.md:110` / `glossary.ja.md:132`、`docs/guide/02-your-first-workflow.md:162` / `.ja.md:163`、`docs/reference/04-stage-protocol.md:809` / `.ja.md:696`、`docs/harness-engineering/08-construction-and-swarm.md:57` / `.ja.md:32`、`docs/reference/04-stages/construction.md:54` / `.ja.md:54`、`docs/guide/04-phases-and-stages.md:219` / `.ja.md:215`。意味論を変える改訂を禁止(BR-4)。

### U(不変)= 39 行(en 20 + ja 19)

mode 3 値の列挙・UI 選択肢の semi 表示・quality repair の semi/full 共通記述・legacy ladder 用語集など。全数: en — `workshop-mode.md:331`、`glossary.md:60`、`16-worked-examples.md:283`、`02-your-first-workflow.md:173`、`04-phases-and-stages.md:231,261,295,316`、`08-construction-and-swarm.md:37,61,68,101`、`04-stage-protocol.md:794,921,928`、`03-orchestrator.md:244,441`、`12-state-machine.md:181,189`、`04-stages/construction.md:81`。ja — `workshop-mode.ja.md:435`、`glossary.ja.md:82`、`16-worked-examples.ja.md:335`、`02-your-first-workflow.ja.md:179`、`04-phases-and-stages.ja.md:227,257,291,312`、`08-construction-and-swarm.ja.md:20,35,54`、`04-stage-protocol.ja.md:681,791,793`、`03-orchestrator.ja.md:244,441`、`12-state-machine.ja.md:181,189`、`04-stages/construction.ja.md:80`。

`12-state-machine.md:189`(両言語)は questions D6 のとおり U(「grant を発行しない」は FR-AUTH-3 で新意味論でも真)。

**件数の機械照合**: R 13 + P 12 + U 39 = 64 = grep 実測総行数(第2キー検出 4 箇所は token `semi` 非含有のため 64 の外数)。

## BR-8: 新しい semi 正本定義の内容要素(改訂文が必ず述べること)

`stage-protocol.md:131` の新 1 行定義、および R 行の改訂文は、以下の内容要素と矛盾しないこと(具体文面は code-generation が起草 — 本書は内容契約のみを固定する):

1. **質問は無人解決** — semi は `question` occurrence を full と同一の**5 段梯子**(confirmed-policy / norm / history / solo-election / agent-recommendation)で無人解決する(FR-LAD-1/2/4。段数「5」は requirements 申告1 で 4→5 へ訂正済みの値)。
2. **裁定は `AUTO_DECIDED` として記録**され、後段 2 段(solo-election / agent-recommendation)由来は unreviewed queue へ入る(FR-LAD-4)。
3. **節目は人間** — phase 境界・walking skeleton・Intent 終端は人間裁定のまま(FR-LAD-5)。
4. **grant を持たない** — semi は current grant = null を維持する(FR-AUTH-3)。grant の代わりに semi 専用の軽量認可基体で裁定する(FR-AUTH-1 — docs で型名まで述べる義務はない)。
5. **事前裁定方針を運べる** — `--policies-file` は semi でも有効で、confirmed-policy 段の材料になる(FR-POL-1)。
6. **mode 設定は人間由来** — `modeProvenance.kind === "human-command"` の要求は維持(FR-LAD-1 の `:512` 維持)。
7. **語彙は表示系と同一** — mode 名は `--status` の `Autonomy:` 行と同じ `none` / `semi` / `full` を用い、独自語彙を作らない(FR-DISP-1 / In-4)。
8. BR-5 の禁止語彙を含まない。

## BR-9: 実装時の棚卸し再実行義務

本書の行番号目録は HEAD `5f6561eef6098209c4c29461ae0d7c6d070b5c01` 断面の実測である。code-generation は着手時に (a) `grep -rn "semi" docs/` と (b) 第2キー(`human-owned` / `only under Intent autonomy` / `full.*だけ` / `autonomous Construction`)の 2 キー走査を**再実行**し、base 前進による行シフト・新規行を取り込んでから編集する(`cid:functional-design:inventory-from-grep-each-time` / `cid:reverse-engineering:upstream-cite-reresolve-on-shift`)。

## BR-10: 検証手段(受け入れ基準への機械補助)

| 検査 | コマンド / 手段 | 期待 |
| --- | --- | --- |
| V1: 旧定義の残存(機械補助) | `grep -rn "boundaries and questions\|と質問を人間\|と質問は人間\|human-owned for questions\|質問は人間所有\|質問は人間へ戻す" docs/` | **0 hit**(R 行の改訂完了の必要条件。十分条件はレビュー実読 — 免責代替禁止 `cid:requirements-analysis:exemption-clause-must-not-substitute`) |
| V2: 禁止語彙(FR-LAD-6) | `grep -rn "phase を完走\|phase 1個\|whole phase\|complete[s]* a phase unattended" docs/ packages/framework/core/amadeus-common/protocols/stage-protocol.md` | 0 hit |
| V3: 保存行の diff 非出現 | `git diff <base>..HEAD -- packages/framework/core/amadeus-common/protocols/stage-protocol.md` の hunk に `:105` / `:808` 相当行が無い | 非出現 |
| V4: ペア同期 | `git diff --name-only <base>..HEAD -- docs/` の集合が `<name>.md` ⇄ `<name>.ja.md` ペアで閉じる | ペア閉包 |
| V5: canonical 唯一編集 | `bun run build` 後 `git status --porcelain` が空(追跡ファイル不変) | 空 |
| V6: 対象ファイル数 | `grep -rln "semi" docs/ \| wc -l` | 22(改訂は意味論の書き換えであり token `semi` の除去ではない — 件数は不変が既定。増減した場合は BR-9 の再走査で理由を確定) |

V1 の検索語は装飾フリーの核心部分文字列で構成した(`cid:requirements-analysis:reservation-transcription-count-check` 留保の流儀)。V1〜V2 は機械補助であり、FR-DOC-1 AC の最終判定はレビュー実読が担う。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-05T11:48:27Z
- **Iteration:** 1
- **Scope decision:** none

全 file:line 引用(stage-protocol.md 9行、docs 64行の R13/P12/U39 全数分類、第2キー4箇所、14ミラー内訳)が worktree HEAD 実測と完全一致し、要件(FR-DOC-1/2, FR-LAD-5/6, FR-ADV-5)・上流6件・禁止語彙・検証手段のいずれにも欠陥を検出しなかった。

### Findings

- FOLLOW-UP | business-rules.md:21, domain-entities.md:32 — 「on-disk ミラー14本(self-install5+dist8+canonical1)」の出典を codekb code-structure.md 現在節としているが、codekb は本レビューの consumes/pass-list 外。値自体は `Glob **/stage-protocol.md` で 14件(canonical1+self-install5+dist8)と独立に一致確認できたため実害はないが、次回以降は requirements.md:212 のようにコマンド出力転記の出典を優先し、スコープ外資料への単独依拠を避けること
