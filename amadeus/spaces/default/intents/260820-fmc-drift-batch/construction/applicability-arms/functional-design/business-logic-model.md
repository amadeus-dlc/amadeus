# Business Logic Model — applicability-arms(U4 / #3186)

上流入力: `inception/units-generation/unit-of-work.md`(U4 節)/ `unit-of-work-story-map.md`(#3186 クローズ条件)/ `inception/requirements-analysis/requirements.md`(FR-ARM-1〜7、FR-REG-5 後半、OQ-1/OQ-4)/ `inception/application-design/components.md`(C1)/ `component-methods.md`(C1 変更面)/ `services.md`(applicability 判定の CLI 面)。file:line は現行 observed 断面(2026-08-20 本ステージ実読)。

## 判定 pipeline への段挿入(決定的手順)

1. **挿入位置(ADR-3)**: `tla-applicability.ts` の `judge()`(J1..J6 表、`:313` 近傍)が route を返した**後・receipt 構築前**に armCheck(vocabularyDrift / defectRecurrence)+ coverageCheck 段を評価する。既存の J1..J6 分類クラス・強制規則(`stages/tla-authoring.md:51,55-56`)・receipt 契約(#3262、`tla-authoring.ts:447-450` の terminal-route fail-closed)は変更しない(FR-ARM-7 — 追加は発火述語のみ)。
2. **vocabularyDrift 腕(FR-ARM-1、OQ-1 確定)**: 判定対象 subject が登録済みモデルと交差する(`intersectsRegisteredModel` `:121-133` の document-identity 交差契約の上)とき、交差した**全**モデル(FR-ARM-4 — 特定モデルのハードコード禁止)について次の3検査を行う:
   - **(a) 値集合クラスタ照合(発火述語)**: モデル .tla の文字列リテラル値集合定義(`Identifier == {"lit", ...}` 形を parse — 例 `PrConvergenceGate.tla:14` `Verdicts == {"none", "created", "converged", "override"}`)を集合 S とし、governed entries の実装ソースから**同一行または単一 union 型宣言内に共起する文字列リテラルのクラスタ**を採取する。クラスタ C が `|C ∩ S| ≥ 2` かつ `C ⊄ S` のとき drift 検出。**【2026-08-20 改訂 — 選挙 E-260820-FMC-CG-U4DEV 2-0】**: この文字どおりの形は MirrorLifecycle の governed ソース(MirrorProjectSyncState × Statuses ∩=2 非包含、MirrorOperation ⊇ NonCloseOps)で本節自身の陰例要求と矛盾する偽陽性を実測したため、確定形を次の**単調強化**へ改訂する — 発火条件 = 「クラスタ C がサイズ≥2 の宣言済み値集合 S を**完全被覆**(S ⊆ C)」**かつ**「C にモデルの**全宣言語彙**に不在のリテラルが1つ以上存在」。この形の発火はすべて旧形も満たし(S⊆C ⇒ |C∩S|=|S|≥2、unknown リテラル ⇒ C⊄S)、陽例2件(PrConvergenceGate/BoltPrAttestationGate の landed クラスタ)は発火維持、MirrorLifecycle は非空虚な陰例として非発火、FormalElection は値集合ゼロの空虚な陰例(テストが明示 assert)。実装: `tla-applicability-arms.ts` の cluster 述語。受け入れ基準の実 corpus 赤は**二層**で構成し、他 unit の着地順に依存させない(承認済み unit graph の辺は U3→U4 のみ — 新しい辺を仮定しない): **(i) 述語レベル(U1/U2 非依存)** — クラスタ述語そのものへ実 corpus を直接与える: S = 実 `PrConvergenceGate.tla:14` の Verdicts、実装リテラル源 = 実 `pr-convergence-cli.ts` bytes(model-map 登録の有無と無関係にファイルを直接入力)。クラスタ {"converged","override","landed","superseded"}(`:735-744` `transitionAllowed`)が交差2・非包含({landed, superseded})で赤 — 現状のまま赤であり、是正経路 = revise-model 明示評価の提示 → 裁定後に緑、の1セットはこの層で成立する。**(ii) pipeline レベル(fixture)** — 合成 model-map fixture(synthetic モデル + governed entry が fixture 実装ファイルを指す)で `intersectsRegisteredModel` 経由の発火・非発火の両側を固定する(一般形 fixture — BR-2)。実 model-map に PR系モデルの plugin entries が存在する断面(U2 の FR-BND-4 が本線に着地した後)では pipeline レベルでも実 corpus 発火が観測できるが、それは**実装時にその断面が成立していれば追加で実測・記録する条件付き検証**であり、本 unit の受け入れ基準にはしない(着地順を前提事実として主張しない)。
   - **(b) 検査プロパティクラスの報告**: モデル cfg の `PROPERTY`/`PROPERTIES` 節の有無を判定し(PrConvergenceGate.cfg は不在 — issue-evidence 事実5)、`invariants-only | has-properties` のクラスを drift 報告面に含める。これは独立の発火条件ではなく、強制された revise-model 評価への入力(検査能力の欠落を裁定者に可視化する)。
   - **(c) vocabulary 自己整合(fail-closed)**: `vocabulary.namedInvariants` の各名が .tla 内に定義済みであること、`traceStateVariables` が VARIABLES に現れることを照合し、不一致・.tla/.cfg parse 不能は**判定不能 = 明示 halt**(NFR-2 — 素通り禁止)。
   drift 検出時は impl-only への静かな落下を禁じ、revise-model の明示評価を強制する。明示裁定で「改訂不要」とする場合は既存の terminal-route receipt(#3262)として記録し、**裁定済みを理由に以後の検査をスキップする分岐・検証されない宣言面を新設しない**(NFR-1)。
3. **defectRecurrence 腕(FR-ARM-2、OQ-4 確定 + OQ-AD-2 確定)**: 入力は intent record の `issue-evidence.md` を **CLI 引数(`--issue-evidence <path>`)で受ける** — plugin→core の import 方向は新設しない(実測: `plugins/formal-model-check/tools/` に core import は現状 0 件であり、この境界を維持する。record パス解決は conductor の知識で、判定器は与えられたファイルだけを読む)。GitHub への実行時照会はしない(RA Q4=A)。
   - **発火意味論**: **単発交差** — issue-evidence 内の bug Issue が名指す実装パスと governed entries(`implPath`)の distinct ファイル交差が **1 件以上**で authoring 評価を強制起動する(同一 implPath への複数 Issue は要求しない)。重大度フィルタは設けない(bug 種別のみで判定)。
   - **観測レンジ(実測 2026-08-20、corpus = `amadeus/spaces/default/intents/*/ideation/intent-capture/issue-evidence.md` 全3件、述語 = `grep -oE "(packages/framework/core/tools|plugins/[a-z-]+/tools)/[a-z0-9-]+\.ts" | sort -u` と governed implPath 集合の交差)**: 260817-inception-cost-batch = 0 件(amadeus-mirror.ts は非 governed)、260818-priority-bug-batch-4 = 2 件(orchestrate/state)、260820-fmc-drift-batch = 1〜2 件(orchestrate は現行、predicate は U2 登録後)。閾値 1 は観測レンジの内側(観測最小 0 < 閾値 1 < 観測最大 2 — 両側とも狭義不等号で固定、cid:code-generation:c1-threshold-inside-observed-range / FR-ARM-2 AC)。**発火率**: 3 intent 中 2(いずれも issue-first)— issue-evidence を持たない intent では構造的に非発火であり、全変更への一律義務化にならない(FR-ARM-6 / two-layer posture と整合)。重大度層別をしない根拠: corpus 3 件では severity 層別の観測レンジが構成できず、レンジ外の閾値は全赤/全緑になる。
   - **エラー処理**: `--issue-evidence` 不在または指定ファイル不在 = 非発火(issue-first でない intent の正常系)。ファイル実在 + parse 不能 = fail-closed halt(NFR-2)。
4. **coverageCheck(FR-ARM-5)**: 判定対象 subject の実装面(変更対象ファイル集合 — CLI 引数 `--changed <path,...>` で conductor が供給)と governed entries の被覆を照合し、未被覆ファイルがあれば**不足面を判定成果物へ明記**し entries 拡張を裁定対象として提示する。**non-target への再分類は行わない**(#3186 完了条件2の禁止節 — J2d undecidable 反証確定、RA §12a MINOR-1)。halt ではなく明記 + 裁定提示。`--changed` 未供給時は「被覆確認未実施」を receipt へ明記する(無音の素通りにしない)。
5. **receipt 整合(FR-ARM-3)**: 両腕の判定結果(発火有無・drift 詳細・プロパティクラス・被覆不足面)は判定成果物の一部として既存 receipt 契約(#3262)へ載せ、監査可能にする。Result 判別ユニオンで返し、検出と receipt を分離しない(component-methods.md C1)。
6. **AUTHORING_ROUTES import 置換(FR-REG-5 後半)**: `tla-applicability.ts:302` の定義を削除し、leaf `plugins/formal-model-check/tools/authoring-routes.ts` からの import に置換する。leaf は U1(C2)が新設する — この順序は本 FD が新設する辺ではなく、承認済み `components.md` C1/C2 と ADR-1 の帰結(「C1 の import 切替は C2 着地後」)を消費するもの。実装時に leaf の実在を確認してから切替え、不在なら停止する(先行して自前定義を複製しない — cg2-agreeing-predicate-drift の再導入禁止)。census(帰属条件): applicability 側の定義 0 件・leaf 定義 1 件。判別 discriminator: 定義行は `= new Set(`、import 行は `import {`(U1 §12a FOLLOW-UP の discriminator を共有)。
7. **stage 契約 + docs 追記(FR-ARM-6、C1 所有面)**: `stages/tla-authoring.md` の classification 手順(`:51` 近傍 — U3 が `:53` を撤去した後の断面)へ発火述語(腕2本 + 被覆確認)を明文追加し、two-layer 整合 — 「腕はモデル改訂の要否判定を強制するのであって全変更への TLC 実行を強制しない」(team.md two-layer-verification-posture)— を stage 契約と `docs/reference/22-formal-model-supply.{md,ja.md}`(U3 撤去後断面への追記、en/ja 同一変更)の両面に明記する。
8. **CLI 出力面(services.md 整合)**: applicability 判定の出力に腕チェック結果を加える dispatch 変更は `tla-authoring.ts` の applicability verb 出力面のみ(新 verb なし・新 CLI なし — ADR-3)。
9. **生成台帳**: 新規テスト追加により `bun tests/gen-coverage-registry.ts` regen を同一変更へ同梱。台帳クラスの書き分け(units-generation §12a FOLLOW-UP): 本 unit が書くのは coverage-registry(regen で閉じる)のみを既定とし、coverage-patch-allowlist は CI の Patch Coverage Gate が UNCOVERED を返した場合に限り createSemanticSelector 再アンカーで閉じる(regen 形では閉じない — 別クラス)。model-map ハッシュピンは U4 非接触(engine ファイルに触れない)。

## 落ちる実証(FR-ARM-1/2)

- **vocabularyDrift(二層 — 手順2(a) の設計どおり)**: **(i) 述語レベルの実 corpus 赤(U1/U2 非依存)** — クラスタ述語へ実 `PrConvergenceGate.tla` の S と実 `pr-convergence-cli.ts` bytes を直接入力し、現状のまま赤(注入不要)。BoltPrAttestationGate にも同型の `landed` 欠落(`BoltPrAttestationGate.tla:22-23` 逐語同一)があり、一般形(FR-ARM-4)の2例目として同じ層で検出されることを固定。正当な既存データで赤くならない側: FormalElection / MirrorLifecycle の実 .tla × それぞれの governed 実装ソースで発火しないことを同じ述語レベルで実測(両側テスト)。**(ii) pipeline レベルの発火(fixture)** — 合成 model-map で `intersectsRegisteredModel` 経由の発火・非発火の両側を固定。実 model-map 経由の pipeline 実測は U2 entries が本線に存在する断面での条件付き追加検証(受け入れ基準外)。
- **defectRecurrence**: 交差ありの fixture(260818 相当 — governed 2 件)で強制起動、交差なしの fixture(260817 相当 — 0 件)で非発火、の両側テスト + 閾値 1 の両側固定(観測最小 0 < 1 < 観測最大 2)。
- **fail-closed 面**: parse 不能 .tla / parse 不能 issue-evidence の fixture で明示 halt(素通りしない)を固定。

## 生成台帳・CI 整合(FR-X-1)

blocking CI 集合 + coverage-registry regen 同梱。stage 契約・docs の変更は prose リテラル pin テスト(bt-prose-literal-test-ledger クラス)の census を `packages/ tests/ docs/ plugins/` で行い、変更リテラルを pin するテストの有無を実測してから着地する。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-20T13:57:50Z
- **Iteration:** 1
- **Scope decision:** none

3成果物は相互整合し OQ-1/OQ-AD-2/OQ-4 を具体機構で閉じるが、FR-ARM-1 の実 corpus 落ちる実証が承認済み unit graph に存在しない U2→U4(および U1→U4)着地順依存を既成事実として主張しており、P3 上の無申告依存追加かつ実装時に再現不能となりうる implementability ギャップ。

### Findings

- BLOCKER | business-logic-model.md §2(a) と domain-entities.md §ライフサイクル が、FR-ARM-1 実 corpus 赤の前提として U2 の plugin entries 登録・U1 leaf の着地を「着地済み」の事実として主張 — 承認済み unit-of-work.md §Constraints は U3→U4 の1辺のみを宣言し U1/U2/U3 並列可と明記。FD READY は設計完了の証拠であって着地の証拠ではない。辺の正式追加(units-generation/delivery-planning 差戻し)か、着地順に依存しない落ちる実証への再設計で解消する
- NIT | 閾値の両側固定の表記が 観測最小 0 < 1 ≤ 観測最大 2 と上側に ≤ を使う — FR-ARM-2 の AC は両側狭義(< 閾値 <)。実数値 1 < 2 は充足しており表記の不整合のみ

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-20T14:02:09Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の BLOCKER は原発箇所(落ちる実証の二層化・Lifecycle 節)で真に解消され NIT も修正済みだが、domain-entities.md の表セル2箇所(変更されるエンティティ:19『U1 着地済み』・不変のエンティティ:27『U1 の着地物』)に同じ欠陥クラスの残存があり、同一文書内の是正済み Lifecycle 節と自己矛盾する。

### Findings

- BLOCKER | domain-entities.md の表セル2箇所が U1 着地を既成事実として主張し、同文書の是正済みライフサイクル節・business-logic-model.md 手順6・unit-of-work.md の並列宣言と矛盾 — 両セルを『U1 が新設 — 実装時に実在確認、不在なら停止』の条件付き文言へ揃える
