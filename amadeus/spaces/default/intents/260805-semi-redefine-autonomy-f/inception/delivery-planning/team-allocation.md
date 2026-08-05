# Team Allocation — semi 再定義と `--autonomy` 起動宣言(#2253)

上流入力(consumes 全数): requirements.md, components.md, unit-of-work.md, unit-of-work-dependency.md, unit-of-work-story-map.md, stories.md(不在), mockups(不在), team-practices(= `amadeus/spaces/default/memory/team.md`)

本文書は上記を次のとおり実参照する。`unit-of-work.md` の 7 Unit の kind(library × 6 / spec × 1)と複雑度(L / M / S)を担当割当の粒度根拠とし(§Bolt ごとの割当)、`unit-of-work-dependency.md` の §並行開発の機会 と §ファイル交差 を同時アクティブ数の上限根拠とし(§同時実行の上限)、`components.md` の C1〜C18 の所在を builder への read/write スコープ指定の根拠とし(§Bolt ごとの割当)、`requirements.md` の NFR-1(落ちる実証)/ NFR-4(TDD)/ NFR-7(ブロッキング検査集合)と C-8(PR 粒度)をレビュー責務の内容とし(§責務の定義)、`unit-of-work-story-map.md` の §Unit を跨ぐ関心 を「誰が横断制約を見るか」の割当根拠とする(§横断関心の所有)。

**`stories.md` は存在しない**(user-stories ステージ SKIP、実測: `ls .../inception/user-stories` → `No such file or directory`)ため、ペルソナ別の担当分けは行わず、FR / Unit 単位で責務を割り当てる。`mockups` も同じ理由で不在であり、UI レビュー役は置かない(本 intent に UI 面が無いことは `unit-of-work.md` §Construction 成果物の適用範囲 の「`service` / `ui` / `packaging` に該当する Unit は本 intent に無い」と一致する)。`team-practices`(`team.md`)からは § Operating Modes(ソロモードの判定)・`cid:requirements-analysis:parallel-bolts`(同時アクティブ builder は最大4)・`cid:requirements-analysis:role-model`(役割は固定メンバー名でなく責務と帽子で割り当て、自己実装の自己レビューは禁止)・`cid:code-generation:c2`(worktree 隔離のディスパッチ規律)を採る。

---

## 実行形態: ソロモード

**Team Formation ステージ(1.5)は実行されていない**(実測: `ls .../ideation/team-formation` → `No such file or directory`。ideation 配下は `intent-capture` と `scope-definition` の 2 ステージのみ)。したがって本文書は名指しの mob を持たない。`cid:approval-handoff:c3`(Team Formation が SKIP された場合、未確定の named mob や Construction schedule を捏造しない)に従い、**実在しない人員・チーム名を書かない**。

実行形態は `team.md` § Operating Modes のソロモードである。`AMADEUS_OPERATING_MODE=team` は設定されていないため、leader / member の配送・agmsg ack・複数メンバーの定足数・最低 2 名レビューは適用しない。1 エージェントが工程ごとに conductor / builder / reviewer の**帽子**を順に被り、独立性が必要な工程は fresh subagent 隔離で確保する。

---

## 責務の定義(能力ではなく責務)

| 帽子 | 誰が被るか | 責務 | 被ってはならないもの |
| --- | --- | --- | --- |
| **conductor** | 本線セッション(main agent) | 指令ループの駆動、Bolt のディスパッチ、ゲート提示、§13 学習リチュアル、state / audit の遷移、PR の発行と収束ループ、ユーザーへのエスカレーション | 自ら実装しない(Bolt の実装は worktree 隔離の builder へ委譲する)。ただし builder 無応答時の引き取り(`cid:code-generation:c5` / `cid:code-generation:disk-evidence-early-takeover`)は差分検分と検証コマンド再実行を必須として行う |
| **builder** | Bolt ごとの worktree 隔離サブエージェント | 割当 Unit の TDD 実装(Red の実測 → 最小実装 → Green)、落ちる実証の 1 セット実施、自 PR 内の allowlist remap、検証コマンドの同期完遂と完了報告 | engine 操作(`amadeus-orchestrate.ts` の next / report / park、`amadeus-state.ts`、`amadeus-log.ts`、`amadeus-bolt.ts` の state 変更、`amadeus-election.ts`、`amadeus-learnings.ts`)を行わない(`cid:practices-discovery:c2-engine-mutation-ban` / `cid:build-and-test:cg-subagent-state-mutation-ban`)。割当 worktree 外での git 状態変更を行わない |
| **reviewer** | `amadeus-reviewer-runtime` 経由の独立サブエージェント(実装者と別) | §12a レビュー、要件・設計からの無申告逸脱の検出、落ちる実証の要求、slop・不要な後方互換レイヤーの検出 | 自己実装の自己レビュー(`cid:requirements-analysis:role-model`)。成果物本文への書込(verdict は最終テキスト / 指定の verdict 経路のみ) |
| **裁定者** | ユーザー(人間) | walking-skeleton ゲートの承認、PR マージの承認、U-2 の仕様裁定、正準リスト該当事項 | — |

---

## Bolt ごとの割当

`cid:code-generation:c1-parallel-degrade-batch` / `cid:code-generation:c2` に従い、builder は Bolt ごとに専用 worktree を持つ。read/write スコープは Unit が触るファイル集合(`unit-of-work-dependency.md` §ファイル交差)に一致させる。

| Bolt | Unit | 複雑度 | 実行波 | builder の書込スコープ(正本) | 併走する Bolt |
| --- | --- | --- | --- | --- | --- |
| 1 | `semi-authorization-core` | L | 単独 | `core/tools/amadeus-intent-autonomy.ts` / `-runtime.ts` / `-production.ts`、`tests/unit/t431-*`、`tests/.coverage-patch-allowlist.json`、新規 t440〜t442 | なし(walking skeleton) |
| 2 | `semi-policy-carrier` | M | 波 A | `core/tools/amadeus-intent-autonomy.ts` / `-runtime.ts` / `-production.ts`、`core/tools/amadeus-bolt.ts`、`core/tools/amadeus-utility.ts`、新規 t443 / t444 | 3 / 4 / 5 |
| 3 | `stop-question-carveout` | S | 波 A | `core/hooks/amadeus-stop.ts`、`tests/integration/t121-*`、`tests/unit/t147-*`(コメント)、allowlist、新規 t445 | 2 / 4 / 5 |
| 4 | `launch-autonomy-flag` | M | 波 A | `core/tools/amadeus-orchestrate.ts`(`:1044-1074` + `handleNext`)、allowlist、新規 t446 / t447 | 2 / 3 / 5 |
| 5 | `autonomy-statusline` | S | 波 A | `core/hooks/amadeus-statusline.ts`、新規 t448 | 2 / 3 / 4 |
| 6 | `advisory-auto-resolution` | L | 波 B | `core/tools/amadeus-advisory-choice.ts`、`core/tools/amadeus-orchestrate.ts`(`:781-800`)、allowlist、新規 t449〜t451 | 7 |
| 7 | `semi-docs-revision` | M | 波 B | `docs/`(22 ファイル)、`core/amadeus-common/protocols/stage-protocol.md`、新規 t452 | 6 |

**書込スコープの非交差**: 波 A の 4 Bolt が触るファイル集合は互いに素である(`unit-of-work-dependency.md` §並行開発の機会 の「触るファイルは互いに素」)。唯一の例外は共有台帳 `tests/.coverage-patch-allowlist.json` であり、Bolt 3 / 4 が同一波で触る — 挿入位置を分散し、後にマージされる側が base 前進後に remap をやり直す。波 B の 2 Bolt(コード面 / docs 面)は完全に非交差である。

---

## 同時実行の上限

- **同時アクティブ builder の上限は 4**(`cid:requirements-analysis:parallel-bolts`)。「アクティブ」は実装作業中の builder を指し、レビュー待ち・承認待ちの完了済み作業は枠外である。
- 波 A は 4(上限ちょうど)、波 B は 2。Bolt 1 は 1(単独)。**上限超過は無い。**
- 波 A に 5 本目(`advisory-auto-resolution`)を入れない理由は 2 つある: (a) 上限 4 を超える (b) `amadeus-orchestrate.ts` を Bolt 4 と同時に触ることになり、`unit-of-work-dependency.md` §ファイル交差 が課す「後着側の実 diff 再評価」を並行下で実施することになる。詳細は `risk-and-sequencing-rationale.md` §トポロジ順からの逸脱。

---

## 横断関心の所有

`unit-of-work-story-map.md` §Unit を跨ぐ関心 の 7 項目について、「誰が見るか」を割り当てる。単独の Bolt に閉じない制約は conductor が全 Bolt の PR で確認する。

| 横断関心 | 主担当 | conductor の確認点 |
| --- | --- | --- |
| FR-LAD-6(走行単位の主張の限定) | Bolt 3(構造面)/ Bolt 7(記述面) | 両 Bolt の PR で「phase 完走の保証」に相当する記述・主張が無いこと |
| FR-PIN-3(既存グリーン維持の射程) | Bolt 1 / Bolt 3 が自 Unit の反転範囲を宣言 | 他 5 Bolt の PR で semi 関与テスト(実測 13 ファイル)が無改変 green |
| allowlist の行ピン(U-6) | Bolt 1 / 3 / 4 / 6 が自 PR で remap | 各 PR で機械 remap + span 膨張(straddle)検査の証跡があること |
| `amadeus-orchestrate.ts` の 2 領域 | Bolt 4(先着)/ Bolt 6(後着) | Bolt 6 の着手前に実 diff 再評価が済んでいること |
| ADR-4 の読み口規則(`semiPoliciesOf` の 1 本) | Bolt 1(宣言と総関数)/ Bolt 2(書き手と `policyCount`) | 両 PR で `projection.semiPolicies` の直読が 0 件(`.length` にも例外なし) |
| C-3(directive 値域の非同一視) | Bolt 4 | 全 Bolt の PR で `core/tools/amadeus-directive.ts` が diff に現れないこと |
| U-2(ユーザー裁定を要する未確定) | Bolt 6 が観測、**裁定はユーザー** | Bolt 内でも Bolt 間でも単独決定しない。Bolt 1 のゲートで先行提示する(`bolt-plan.md` §先行して起票する裁定事項) |

---

## Program Board の非適用

`team.md` § Operating Modes のソロモードであり、実行主体は 1 チーム(= 1 セッション)である。したがって Program Board(チーム数 > 1 のときの Bolt × チームの盤面)は作らない。波 A / 波 B の並行は同一チーム内の worktree 並行であり、チーム間の依存調整を要しない。

---

## スキルギャップと外部人員

**なし。** 本 intent の 7 Unit はすべて既存コードベース(`packages/framework/core/`)の TypeScript / Bun 面の改訂であり、新しいランタイム・新しい外部サービス・新しい配布経路を導入しない(`unit-of-work.md` §Unit 一覧 の deployment model は 6 件が `embedded`、1 件が `shared`)。外部リソース調達・採用・アップスキルの計画は不要である。この判定の反証可能な根拠は `external-dependency-map.md` §外部サービス依存の不在 に記す。
