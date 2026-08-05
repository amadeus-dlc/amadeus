# Unit of Work — semi 再定義と `--autonomy` 起動宣言(#2253)

上流入力(consumes 全数): components.md, component-methods.md, services.md, component-dependency.md, decisions.md, requirements.md

本文書は上記6成果物を次のとおり実参照する。`components.md` の C1〜C18 表(責務・所在・推定行数)を Unit への配分母集合とし(§Unit 一覧・§規模の配分)、`component-methods.md` の各コンポーネントのシグネチャと「充足 AC」を Unit 境界の契約根拠とし(§各 Unit の定義)、`services.md` の論理サービス S1〜S11 とプロセス境界 P1〜P5 を Unit の deployment model の根拠とし(§deployment model)、`component-dependency.md` の依存マトリクスと §Unit 分割の示唆(U-A〜U-G)を分割案の出発点とし(§分割の検証)、`decisions.md` の ADR-1〜13 と §未確定事項 U-1〜U-7 を Unit ごとの制約・引き取り先とし(§未確定事項の引き取り)、`requirements.md` の FR 31 件 / NFR 7 件と C-1〜C-10 を Unit の受け入れ境界とする(§FR の配分)。`stories.md` は user-stories ステージが SKIP のため存在しない(実測: `ls .../inception/user-stories` → `No such file or directory`)。ストーリー対応は `unit-of-work-story-map.md` 側で FR / AC 単位に読み替える。

本ステージは**依存トポロジと Unit 境界のみ**を確定する。実装順序の推奨・critical path の特定は行わない(それは Stage 2.8 Delivery Planning の経済判断)。

---

## 測定 ref と数値の出所

- 本文書の件数・行数はすべて **worktree HEAD `d5ca7b4c1100ae4bf28eb7810c1f88fb20b8545a`**(`git rev-parse HEAD` の出力からの転記)での実測または上流成果物からの転記である(`cid:reverse-engineering:measurement-ref-in-artifacts` / `cid:requirements-analysis:numbers-from-command-output-only`)。
- FR 31 件 / NFR 7 件は `grep -oE '\*\*FR-[A-Z]+-[0-9]+\(' requirements.md | sort -u | wc -l` → `31` / 同形の NFR 版 → `7` の出力からの転記。ADR 13 件は `grep -cE '^## ADR-' decisions.md` → `13`。コンポーネント 18 件は `grep -oE '^\| C[0-9]+ \|' components.md | wc -l` → `18`。未確定事項 7 件は `grep -cE '^\| U-[0-9] \|' decisions.md` → `7`。
- 既存テスト番号の最大値は **t439**(`ls tests/unit tests/integration tests/smoke tests/e2e | grep -oE '^t[0-9]+' | sed 's/t//' | sort -n | tail -1` → `439`)。本 intent の新規テストは **t440 以降**を使う。
- 各 Unit の推定行数は `components.md` §コンポーネント一覧の推定行数列(新規 295 行 + 改訂 367 行 = コード面 662 行)と C18 の非コード 29 行からの**機械配分**であり、新たな見積りを起こしていない(`cid:requirements-analysis:ledger-count-mechanical-recalc`)。配分の内訳と合計の一致は §規模の配分 に示す。

---

## Unit 一覧

| Unit | kind | 責務 | 含むコンポーネント | 推定行数 | 複雑度 | deployment model |
| --- | --- | --- | --- | --- | --- | --- |
| `semi-authorization-core` | library | semi の認可基体を新設し、semi の質問を無人裁定梯子へ載せる。第1関門・第2関門・効果適用の3層を一体で置換する | C1 / C2 / C3 / C4 / C5 / C6 / C7 + C8 の**読み側のみ** + FR-PIN-1(`t431`) | コード **237**(227 + C8 読み側 10)+ テスト 7 | L | embedded |
| `semi-policy-carrier` | library | semi の事前裁定方針を人間コマンドから受け取り、確認 digest と `--status` 表示まで通す | C8 の**書き側**(35)/ C9 / C10 / C15 | コード **103** | M | embedded |
| `stop-question-carveout` | library | stop hook の質問 carve-out 述語を full 限定述語から分割し、`:422` のみ semi へ開く | C11 + FR-PIN-2(`t121`) | コード **28** + テスト 13 | S | embedded |
| `launch-autonomy-flag` | library | `/amadeus --autonomy <none\|semi\|full>` の受理・値域検査・宣言判定・mode 適用 | C12 / C13 | コード **99** | M | embedded |
| `autonomy-statusline` | library | statusline へ Autonomy セグメントを追加する | C14 | コード **20** | S | embedded |
| `advisory-auto-resolution` | library | pending advisory の選択を autonomy 梯子で無人解決し、receipt の provenance を判別ユニオン化する | C16 / C17 | コード **175** | L | embedded |
| `semi-docs-revision` | spec | 旧 semi 定義を述べる docs と正本知識(`stage-protocol.md`)を改訂する | C18 の docs / protocol 面 | 非コード **9 行**(`stage-protocol.md`)+ docs 22 ファイル(1 ファイルあたりの改訂行数は**未実測**) | M | shared |

**kind の判定根拠**: 本プロジェクトは常駐サービスを持たず、実行単位は短命 bun プロセスである(`services.md` §サービス概念の当てはめ)。6 Unit はいずれも `packages/framework/core/` 配下のモジュール改訂であり、単独の runtime を持たないため `library` とする。`semi-docs-revision` は実行可能な振る舞いを持たず、`stage-protocol.md` という**その場で消費される契約**と docs を改訂するため `spec` とする。`service` / `ui` / `packaging` に該当する Unit は本 intent に無い(engine・hook はいずれも既存プロセス境界 P1〜P5 の内側の改訂であり、新しいデプロイ単位を作らない — `services.md` §プロセス境界)。

---

## 各 Unit の定義

### `semi-authorization-core`(kind: library)

**所有するもの**: `SemiAuthority`(C1)と `DecisionAuthority`(C2)の新設、`authorizeInteraction` の semi 分岐(C3)、梯子入口と confirmed-policy 段の引数差し替え(C4)、`createGateAutoDecision` の入口ガード(C5)、`selectDecision` / `decide` のルーティング(C6)、`applySemiDecision` の効果認可委譲(C7)。加えて `AutonomyProjection.semiPolicies?` の**フィールド宣言**と総関数 `semiPoliciesOf`、および `assertLegalAutonomyProjection` の片方向不変条件(`component-methods.md` §C1 の追加不変条件ブロック)。

**所有しないもの**: 方針の書き手(`set-mode` の `policies`、`planHumanAutonomyCommand`、`prepareNonFullCommand`)— これは `semi-policy-carrier` が持つ。

**境界の根拠**: `component-dependency.md` §ファイル単位の交差判定 が「`amadeus-intent-autonomy.ts` (961) は最も交差が濃い(6 コンポーネント)」と実測しており、C1〜C7 は同一ファイル・同一変更理由(semi の認可経路を1本にする — `decisions.md` ADR-1 の置換)である。`component-methods.md` §C6 が示すとおり `selectDecision` の型を `Exclude<DecisionAuthorization, { kind: "human-required" }>` へ絞る改訂と C2 のオーバーロード定義は**同時にしか型が通らない**ため、分割不能である。

**独立に出荷できる価値**: semi mode の Intent で質問 occurrence が `human-required` に落ちず、梯子を降りて `AUTO_DECIDED` として記録される。これが `requirements.md` Intent analysis 2(「全部止まる」と「全部任せる」の中間点)の最小実現である。

**方針ゼロでの縮退**: 本 Unit のみが着地した時点では `semiPolicies` の書き手が存在しないため、`semiPoliciesOf(projection)` は常に `[]` を返し、梯子 0 段目(confirmed-policy、`component-methods.md` §梯子の段別戻り値表 の順 0)は空振りする。裁定は 1〜4 段(norm / history / solo-election / agent-recommendation)で解決される。これは `decisions.md` ADR-4 §「これは互換シムではない」の根拠 3 が「不在の帰結は縮退であって旧挙動の再現ではない」と述べる**正規のドメイン状態**であり、欠落ではない。

**実装上の制約**:

- ADR-1(置換)により `semi-mode-gate` を削除する。併存させない。
- FR-LAD-3 により `createGateAutoDecision:667` の throw を**1文字も変えない**(`component-methods.md` §C5 のガード表)。
- FR-AUTH-2 の落ちる実証は `resolveAutoDecision` の**直接呼び出しテスト**で行う。`decide` 経由では入口ガードに到達しないためである(`components.md` §C2 の申し送り、`component-methods.md` §C6)。
- FR-PIN-1: `tests/unit/t431-intent-autonomy.test.ts:307-313` を本 Unit 内で分割・反転する(§テスト・ピンの所属)。

### `semi-policy-carrier`(kind: library)

**所有するもの**: `HumanAutonomyCommand` の `set-mode` / `revoke-full` への `policies` 追加と `planHumanAutonomyCommand` の `after.semiPolicies` 設定(C8 の書き側、`component-methods.md` §C8 の入力→`after.semiPolicies` 表)、`prepareNonFullCommand` の policies 受け取りと `nonFullCommandDisplayDigest` の1定義化(C9、ADR-5)、`handleSetAutonomy` の `--mode none --policies-file` loud 化(C10)、`IntentAutonomyStatusEnvelope.policyCount` と `--status` の `Policies:` 行(C15)。

**境界の根拠**: 4 コンポーネントの変更理由は単一 —「semi が事前裁定方針を持てるようにする」。C15 を表示 Unit ではなく本 Unit に置くのは、`policyCount` の供給元が `semiPoliciesOf(projection)`(ADR-4 Consequences)であり、C8 の書き側が着地していない状態では常に 0 を返して FR-DISP-2 の受け入れ基準(「`Policies: 0` ではなく実数を表示」)を満たせないためである。すなわち C15 と C8 は**片側だけでは利用者価値を出荷できない**組であり、`cid:units-generation:c1` に従い同一 Unit へ統合する。

**独立に出荷できる価値**: `amadeus-bolt set-autonomy --mode semi --policies-file <json>` が方針を運び、semi の質問が梯子 0 段目(confirmed-policy)で決定的に解決される。`--status` が方針件数を表示する。

**実装上の制約**: ADR-4 により `semiPolicies` は**任意フィールド**のままとし、必須化しない(必須化は既存 journal の replay を全損させる — `decisions.md` §可逆性の総括 の追加検討)。読み口は `semiPoliciesOf` の1本に閉じ、`projection.semiPolicies` の直読を作らない。

### `stop-question-carveout`(kind: library)

**所有するもの**: `isFullyAutonomousIntent`(`amadeus-stop.ts:167-178`)の2述語への分割と、呼び出し点3箇所への割当(`component-methods.md` §C11 の呼び出し点表 — `:422` = carve-out、`:457` / `:716` = full 限定)。

**境界の根拠**: `component-dependency.md` §非対称な依存 が「C11 は他のどのコンポーネントにも依存されない(依存マトリクスの C11 行・列がともに空)」と実測しており、ファイル交差もゼロ(`amadeus-stop.ts` を触るのは C11 のみ)。最も独立に検証できる単位である。

**独立に出荷できる価値**: semi の Intent で質問が pending でも stop hook が走行を切らない — `requirements.md` FR-LAD-6 が主張する走行単位(「質問で止まらない」)の hook 側の実現。

**`semi-authorization-core` への依存の理由**: carve-out 述語は「質問が来ても止まらない」を意味するが、質問を裁定できなければ止まらないまま先へ進めない。`component-dependency.md` §Unit 分割の示唆 が U-C の依存理由を「semi が質問を裁定できて初めて carve-out に意味が出る」と述べるとおりである。加えて FR-PIN-2 の `t121:1138-1150` 反転は本 Unit で行う(§テスト・ピンの所属)。

**実装上の制約**: FR-STOP-2 により `AUTONOMOUS_BLOCK_CAP`(`:153`)と `stopBudgetMode`(`:157-160`)は本 Unit の diff に現れてはならない。FR-STOP-1 の受け入れ基準(2)は「述語を無条件共有へ戻すと赤になる」落ちる実証を必須とする。

### `launch-autonomy-flag`(kind: library)

**所有するもの**: `parseNextFlags` の `--autonomy` 分岐と値省略捕捉(C12)、`applyLaunchAutonomyDeclaration` と `readLaunchAutonomyContext`(C13、`component-methods.md` §C13 の判定順 1〜8)。

**境界の根拠**: parser(C12)と適用ハンドラ(C13)は同一ファイル(`amadeus-orchestrate.ts`)かつ論理的に対である。`component-dependency.md` §ファイル単位の交差判定 が「{C12, C13} は同一ファイルかつ論理的に対」として直列化対象に挙げている。C12 が `flags.autonomyMissingValue` を立て C13 が判定 1 でそれを読む(`component-methods.md` §C12 / §C13)ため、片側だけでは FR-CLI-2(3)(値省略の loud)を満たせない — `cid:units-generation:c1` の統合条件に該当する。

**独立に出荷できる価値**: `/amadeus --autonomy semi <自由文>` の一手で走行水準が宣言され、値が intent 自由文へ漏れない。`requirements.md` Intent analysis 1(起動の一手で走行水準を宣言する)の実現。

**`semi-authorization-core` に依存しない理由**: C13 は既存 `applyProductionAutonomyMode` へ委譲するだけで、semi の裁定機構に一切触れない(ADR-8 Decision「engine が持つのは判定と委譲のみ」)。3値の値域は既存 `AutonomyMode`(`amadeus-intent-autonomy.ts:11`)と一致し、新設型を参照しない。したがって `semi` の梯子が未着地でも `--autonomy semi` は mode を設定でき、mode 設定自体が既存の semi 挙動として意味を持つ。

**実装上の制約**: ADR-13 により「宣言済み」の判別子は `modeProvenance.kind === "human-command"` とし、state フィールドの有無・値を使わない。ADR-12 により projection 読取不能は fail-closed で拒否する。C-3 により `directive.intent_autonomy_mode` へ書き込まず、`amadeus-directive.ts:97` / `:606` は本 Unit の diff に現れない。C-6 により `READ_ONLY_FLAGS` へ追加しない。

### `autonomy-statusline`(kind: library)

**所有するもの**: `autonomySegment(stateContent)` と statusline の連結への1セグメント追加(C14)。

**境界の根拠**: `component-dependency.md` §ファイル単位の交差判定 が `amadeus-statusline.ts` (325) を「**独立**」と分類しており、依存マトリクスの C14 行・列はともに空である。

**独立に出荷できる価値**: mode をどの経路で設定したかに関わらず、毎プロンプトの statusline に現在の走行水準が出る。

**依存を持たない理由**: ADR-10 により state ファイルの `Intent Autonomy Mode` を読む。このフィールドは Intent の birth 時点で必ず書かれる(`amadeus-utility.ts:4635` verbatim `- **Intent Autonomy Mode**: none` — `components.md` §C14〜C15 の実測)ため、本 intent のどの Unit も待たずに 3 値すべてを表示できる。

**実装上の制約**: audit projection を読まない(ADR-10 Option B / C の却下理由 — 毎プロンプトの監査全読は表示コストとして過大)。表示語彙は `--status` の `Autonomy:` 行と同一の mode 名を使い、表示専用語彙を作らない。

### `advisory-auto-resolution`(kind: library)

**所有するもの**: `resolveAdvisoryChoiceAutonomously`(C16)と `applyPendingAdvisoryGuard` の改訂、`AdvisoryChoiceProvenance` 判別ユニオンと `recordAdvisoryChoice` への置換・store schema 2 昇格(C17)。

**境界の根拠**: C16 と C17 は同一ファイル(`amadeus-advisory-choice.ts`)で、`component-dependency.md` が交差の度合いを「高(2 コンポーネントが同一ファイル)」と判定している。かつ C16 が receipt を書く相手が C17 の受理関数であり(依存マトリクス C16 → C17)、**C17 だけでは書き手が無く、C16 だけでは receipt を書けない** — `cid:units-generation:c1` の統合条件に該当する。

**独立に出荷できる価値**: full / semi の Intent で pending advisory が1件あっても `next` が `await-advisory-choice` ではなく `run-stage` を返し、選択が `AUTO_DECIDED` として記録される。`requirements.md` Intent analysis 4(人間ターンを要求する隠れた関門で headless 走行が切れない)の実現。

**`semi-authorization-core` への依存の理由**: FR-ADV-1 が「autonomy 認可を通し、full/semi では梯子で選択肢を決める」と規定し、`intent-backlog.md` シーケンシングも「P7 は P1/P2 の認可基体と質問解決コアに依存する」と述べる。C16 は `commitProductionQuestionDecision` 経由で `authorizeInteraction` → `selectDecision` → `resolveAutoDecision` の経路を通るため、semi 側の認可基体が未着地だと semi での受理が成立しない。

**実装上の制約**: ADR-6 により `selector` に advisory instance を含める(実効的に梯子3段への縮退を受け入れる)。ADR-9 により schema 1 の store は既存 fail-closed 経路で hold にし、読替コードを書かない。ADR-11 により `run_required: true` の強制は選択肢空間(主)と効果分類(従)の2面で行い、`amadeus-directive.ts` は触らない(C-3)。

### `semi-docs-revision`(kind: spec)

**所有するもの**: `docs/` 22 ファイル(= 11 対訳ペア)の旧 semi 定義の改訂(FR-DOC-1)と、`packages/framework/core/amadeus-common/protocols/stage-protocol.md` の該当 9 行の改訂(FR-DOC-2)。

**境界の根拠**: 実行可能な振る舞いを持たず、変更理由は単一(「semi の意味論の記述を実態へ揃える」)。`components.md` C18 が「旧仕様ピンと文書」として一括りにしていた集合から、**テストピン(FR-PIN-1 / FR-PIN-2)を外した残り**である(§テスト・ピンの所属 に理由を記す)。

**独立に出荷できる価値**: 利用者が読む文書が実際の挙動と一致する。日英対訳を同一 PR で同期する(FR-DOC-1 受け入れ基準)。

**実装上の制約**: FR-LAD-6 により「phase を完走する」「phase 1個ぶん必ず走る」に相当する記述を書かない。FR-DOC-2 により `stage-protocol.md:105` / `:808`(walking skeleton は `none`/`semi` が人間待ち)は**保存**し、本 Unit の diff に現れてはならない。C-5 により canonical 1 本のみを編集し、on-disk ミラーは `bun run build` の再生成物として扱う。FR-DOC-1 の grep 対象面は `docs/` に限定し、codekb と intent record は記録面として対象外とする(`cid:requirements-analysis:c1-ac-grep-surface-scope`)。

---

## 分割の検証(`cid:units-generation:c1`)

`component-dependency.md` §Unit 分割の示唆 の U-A〜U-G を出発点とし、**各 Unit が独立に実装可能か**、および**片側だけでは利用者価値を出荷できない境界が残っていないか**を検証した。Unit / Bolt の定義そのものは正準(`stage-protocol.md` Glossary)に従い、ここで再定義しない。

| 検証項目 | 結果 |
| --- | --- |
| 各 Unit が単独でビルド・型検査・テストを通せるか | 7 Unit すべて可。ただし依存辺のある Unit は依存先が本線に着地した後の base で成立する(§依存関係は `unit-of-work-dependency.md`) |
| 片側だけでは価値を出荷できない境界が Unit を跨いでいないか | **3 件を統合済み**: (1) C8 書き側 ⇄ C15 表示 → `semi-policy-carrier` (2) C12 parser ⇄ C13 ハンドラ → `launch-autonomy-flag` (3) C16 書き手 ⇄ C17 受理 → `advisory-auto-resolution` |
| 挙動変更とその旧仕様ピンが分離していないか | **2 件を移設済み**(§テスト・ピンの所属) |
| 循環依存がないか | 無し(`unit-of-work-dependency.md` §依存 DAG) |
| 規模の合計が上流と一致するか | 一致(§規模の配分) |

### 上流の U-A〜U-G からの差分(申告)

`component-dependency.md:159` が「**確定は units-generation の責務である**」と明示的に委譲しているため、以下は無申告の逸脱ではない。差分は2点のみである。

1. **C8 を読み側 / 書き側で分割した**(U-A / U-B に跨る)。上流案は C8 を丸ごと U-B に置いていたが、C1 の `SemiAuthority.policies` と C3 の生成は `semiPoliciesOf(projection)` を必要とし、ADR-4 Consequences が `projection.semiPolicies` の直読を禁じている。したがってフィールド宣言と総関数(読み側)は `semi-authorization-core` に無ければ型が通らない。読み側単独は「方針ゼロ = 縮退」という正規のドメイン状態(ADR-4 §根拠 3)を実現し、単独で価値を出荷する。書き側単独では読み手が無く価値を出荷できないが、書き側は読み側へ依存する向きに置かれているため `cid:units-generation:c1` の統合条件には当たらない。
2. **テストピン(FR-PIN-1 / FR-PIN-2)を U-G から挙動変更 Unit へ移した**(§テスト・ピンの所属)。

### テスト・ピンの所属

上流案は C18(ピン + docs)を単一の U-G とし「実態が変わってから改訂」する依存を置いていた。しかし旧仕様ピンは**挙動変更と同一の変更でしか green を保てない**:

- `tests/unit/t431-intent-autonomy.test.ts:311`(HEAD 実測 verbatim `    expect(authorizeInteraction(plan.after, occurrence("stage-gate", ["approve"])).kind).toBe("semi-mode-gate");`)は ADR-1 の置換(`semi-mode-gate` → `semi-authority`)で赤になる。同 `:313`(verbatim `    expect(authorizeInteraction(plan.after, occurrence("question")).kind).toBe("human-required");`)は FR-LAD-1 の改訂で赤になる。いずれも `semi-authorization-core` の変更が原因であり、同一 PR で反転しなければ CI が赤のままマージできない。
- `tests/integration/t121-stop-hook-enforce.test.ts:1138`(verbatim `  test("(f) semi + blank question ALLOWS because questions remain human-owned", () => {`)以下は C11 の carve-out で赤になる。原因は `stop-question-carveout` である。

したがって FR-PIN-1 を `semi-authorization-core` へ、FR-PIN-2 を `stop-question-carveout` へ移し、`semi-docs-revision` は docs と `stage-protocol.md` のみを持つ。FR-PIN-3(既存グリーン維持 AC の射程限定)は両 Unit の受け入れ確認として働く(`unit-of-work-story-map.md` §横断 FR)。

---

## 規模の配分

`components.md` §コンポーネント一覧 の推定行数列からの機械配分。C8 の 45 行のみ、読み側 10 / 書き側 35 に分けた(§分割の検証 の差分 1)。

| Unit | 配分の内訳 | 小計 |
| --- | --- | --- |
| `semi-authorization-core` | C1 75 + C2 50 + C3 20 + C4 30 + C5 15 + C6 25 + C7 12 + C8読 10 | **237** |
| `semi-policy-carrier` | C8書 35 + C9 40 + C10 14 + C15 14 | **103** |
| `stop-question-carveout` | C11 28 | **28** |
| `launch-autonomy-flag` | C12 24 + C13 75 | **99** |
| `autonomy-statusline` | C14 20 | **20** |
| `advisory-auto-resolution` | C16 95 + C17 80 | **175** |
| コード面 合計 | 237 + 103 + 28 + 99 + 20 + 175 | **662** |

コード面合計 662 は `components.md` の「新規 295 行 + 改訂 367 行 = 662 行」と一致する(C8 の内部分割は合計を変えない)。

非コード面(`components.md` C18 の 29 行):

| Unit | 内訳 | 小計 |
| --- | --- | --- |
| `semi-authorization-core` | `t431-intent-autonomy.test.ts:307-313` = 7 行 | 7 |
| `stop-question-carveout` | `t121-stop-hook-enforce.test.ts:1138-1150` = 13 行 | 13 |
| `semi-docs-revision` | `stage-protocol.md` の semi 言及 9 行 | 9 |
| 非コード 合計 | 7 + 13 + 9 | **29** |

`docs/` 22 ファイルの1ファイルあたり改訂行数は**未実測**であり、行数見積りに数えない(`components.md` C18 の脚注が functional-design での実測を確定条件としている — §未確定事項の引き取り の項目 A)。

---

## テスト番号の予約

`cid:code-generation:swarm-test-number-reservation`(並列ディスパッチ時の同時採番による重複回避)に従い、Unit ごとに新規テスト番号を事前予約する。現最大は **t439**(§測定 ref と数値の出所)であり、本 intent は **t440 以降**を使う。

| Unit | 予約する番号 |
| --- | --- |
| `semi-authorization-core` | t440 / t441 / t442 |
| `semi-policy-carrier` | t443 / t444 |
| `stop-question-carveout` | t445 |
| `launch-autonomy-flag` | t446 / t447 |
| `autonomy-statusline` | t448 |
| `advisory-auto-resolution` | t449 / t450 / t451 |
| `semi-docs-revision` | t452 |

既存ファイル(`t431` / `t121` / `t147`)は**その場で改訂**し、番号を振り直さない。実 FS を触るテストは integration 層へ置く(`cid:code-generation:fs-tests-integration-first`、NFR-4 合否基準)。予約番号は上限であって下限ではない — 使わなかった番号は次 intent へ解放する。着手直前に base 前進が新規 tNNN を持ち込んでいないかを固定 base SHA の `tests/` 実測で再確認する(`cid:code-generation:c1-tnnn-collision-on-regrounding`)。

---

## 未確定事項の引き取り

`decisions.md` §未確定事項 の U-1〜U-7(実測 7 件)と、§12a レビュー iteration 1 の是正で成果物本文に残った ⚠ 付き申し送り 4 件(本文書では A〜D と呼ぶ — `decisions.md` の U 表には載っていない)を、引き取り Unit ごとに配分する。

| # | 未確定事項 | 出所 | 引き取る Unit | 確定条件 |
| --- | --- | --- | --- | --- |
| U-1 | 非 full の `confirmedDisplayDigest` 照合点を `planHumanAutonomyCommand` の `set-mode` / `revoke-full` 分岐へ加えるか | `decisions.md` U-1(ADR-5 Consequences) | `semi-policy-carrier` | FR-POL-2 の受け入れ基準を満たす最小形を functional-design で決める |
| U-2 | ADR-6 の selector に instance を含める設計が生む「梯子3段への縮退」が実運用で許容できるか | `decisions.md` U-2 | `advisory-auto-resolution`(観測のみ) | Option B への変更は FR-ADV-1 逐語の改訂であり、エスカレーション正準リスト(4)により**ユーザー裁定**を要する。Unit 内で単独決定しない |
| U-3 | `withAuditLock` の再入可否。C16 を `guardAdvisoryChoices` の外側から呼ぶ配置でロック区間が重ならないことの実測 | `decisions.md` U-3 / `services.md`:192 / `component-dependency.md`:137 | `advisory-auto-resolution` | 実装時実測。重なる場合は C16 の呼び出し位置を再検討する |
| U-4 | `semi-mode-gate` / `MODE_REQUIRES_HUMAN` / `full-grant-required` の文字列を assert する既存テストの全数(2キー棚卸し) | `decisions.md` U-4 | `semi-authorization-core` | 識別子と展開後リテラルの両キーで grep(`cid:application-design:dual-key-consumer-inventory`) |
| U-5 | stop hook 述語の最終命名と `tests/.coverage-patch-allowlist.json:5268` / `tests/unit/t147-kiro-hook-adapter.test.ts:723` の同期 | `decisions.md` U-5(OQ-3) | `stop-question-carveout` | ADR-7 は「分割する」までを確定。命名は functional-design |
| U-6 | `tests/.coverage-patch-allowlist.json` の行ピン再束縛 | `decisions.md` U-6 | **横断**(`semi-authorization-core` / `stop-question-carveout` / `launch-autonomy-flag` / `advisory-auto-resolution` — 行を挿入する 4 Unit がそれぞれ自 PR で実施) | `cid:code-generation:c1-allowlist-mechanical-remap` の機械 remap + `cid:code-generation:cg-allowlist-straddle-swell` の span 検査。縮小見込みの数値は本設計段で断定しない(`cid:application-design:c1-future-value-trace`) |
| U-7 | `run_required: true` を無人経路が `run-now` で解決した後、`formalCheckRoute` の command を誰が実行するか | `decisions.md` U-7(OQ-6) | `advisory-auto-resolution` | 無人経路では `await-advisory-choice` directive を返さないため実行の担い手が未確定。FR-ADV-5 の射程注記と併せて実装時に確定 |
| A | `docs/` 22 ファイルの1ファイルあたり改訂行数が未実測(行数見積りに数えていない) | `components.md`:67 の ⚠ | `semi-docs-revision` | functional-design での実測 |
| B | FR-AUTH-2 の落ちる実証は `resolveAutoDecision` の直接呼び出しテストで行う(`decide` 経由では入口ガードに到達しない) | `components.md`:134 / `component-methods.md`:236 の ⚠ | `semi-authorization-core` | functional-design のテスト設計で公開境界テストとして固定 |
| C | `quality-waiver` が `PROHIBITED_EFFECTS` に収載されていることを assert するテストを置く(ADR-11 の従機構が全面依存) | `decisions.md`:539 の ⚠ | `advisory-auto-resolution` | functional-design でテストを設計し、収載が崩れると赤になることを実証 |
| D | 理由コードが `MODE_REQUIRES_HUMAN` → `SCOPE_OUT` へ変わることに伴う既存テストの棚卸し | `component-methods.md`:123 の ⚠ | `semi-authorization-core` | U-4 と同じ 2 キー棚卸しの一部として実施 |

---

## Construction 成果物の適用範囲(kind 別)

`stage-protocol.md` の per-unit ステージは Unit の canonical `kind` により適用成果物が決まる(`cid:nfr-design:c1-engine-produces-all-five` — 既知 kind では stage frontmatter の `produces_kinds` が適用成果物を絞る)。本 intent の 7 Unit は `library` × 6 と `spec` × 1 であり、`service` / `ui` / `packaging` 固有の成果物は生成されない。適用外成果物の N/A プレースホルダは作らない。

---

## Unit を跨がない制約(全 Unit 共通)

`requirements.md` Constraints から、Unit 分割に関わらず全 Unit が守る境界:

- **C-5 / NFR-5**: 編集正本は `packages/framework/core/` のみ。`dist/` とセルフインストールツリーは `bun run build` の再生成物であり、どの Unit の編集対象でもない。
- **C-7**: 旧 semi 挙動の互換モード・フォールバック・移行シム・二重実装を作らない。旧テストを skip で残す形も禁止する。
- **C-8**: Bolt ごとに PR とし、複数 Unit を単一 PR に束ねない。Bolt 粒度と PR 分割は `cid:units-generation:c1` に従い delivery-planning が決める。
- **C-9**: scope は `self-feature` であり、最初の Construction Bolt に walking-skeleton ゲートを維持する。walking skeleton 候補 Unit は `semi-authorization-core`(§Unit 一覧、`unit-of-work-dependency.md` §walking skeleton 候補)。
- **C-10 / NFR-7**: バージョン面に触れない。PR CI の既存ブロッキング検査集合をすべて満たす。
- **NFR-1 / NFR-4**: 認可・受理ゲートの新設・改訂は TDD を既定とし、落ちる実証(注入 → 赤の実測 → 復元 → 残渣ゼロ確認)を不可分の1セットで行う(`cid:code-generation:falling-proof-injection-one-set`)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-05T08:59:31Z
- **Iteration:** 1
- **Scope decision:** none

7 Unit は C1〜C18 を過不足なく分割し(C8 のみ読み/書きで意図的に分割、申告済み)、FR 31 / NFR 7 の割当に孤立も二重もなく、行数配分 662 は application-design の機械合計と一致する。yaml edge block は様式・kebab-case・宣言済み名参照・非循環(Kahn 机上トレースを独立に再確認)を満たし、テスト番号 t440〜t452 に重複はなく、未確定 11 件すべてに引き取り Unit がある。再現可能な失敗・契約違反・安全性欠陥は検出されなかった。

### Findings

- FOLLOW-UP | amadeus/spaces/default/intents/260805-semi-redefine-autonomy-f/inception/units-generation/unit-of-work-story-map.md:68 — Unit 別 FR 件数の合計 33 が宣言方法(主担当のみ1回)と総数 31 の双方に反する。機械再計算では core 9 / carrier 4 / stop 4 / flag 5 / statusline 1 / advisory 5 / docs 2 = 30 + 横断 FR-PIN-3 = 31
- FOLLOW-UP | amadeus/spaces/default/intents/260805-semi-redefine-autonomy-f/inception/units-generation/unit-of-work-dependency.md:78 — §依存しない辺 の表に launch-autonomy-flag → semi-policy-carrier が無い。上流 component-dependency.md:29 の C13 → C9 辺の消去は不在根拠表側にも1行置く
- FOLLOW-UP | amadeus/spaces/default/intents/260805-semi-redefine-autonomy-f/inception/units-generation/unit-of-work-dependency.md:113 — ADR-3 が裁定した production 層の SemiAuthorityScope 組み立て結線が C1〜C18 のどれにも列挙されず、core の境界・行数・交差表に現れない宙吊り。所属を core と明記して交差表を改めるか、functional-design への引き取り項目にする
- FOLLOW-UP | amadeus/spaces/default/intents/260805-semi-redefine-autonomy-f/inception/units-generation/unit-of-work-dependency.md:70 — stop→core と docs→3Unit の辺は意味論的依存であり、hard(型)/ soft(意味)の区別を注記すると 2.8 が制約の強さを誤読しない
- NIT | amadeus/spaces/default/intents/260805-semi-redefine-autonomy-f/inception/units-generation/unit-of-work.md:232 — §Unit を跨がない制約 に C-1/C-2/C-4 が現れず、全 Unit 共通面か特定 Unit 面かの区別が1行ほしい
