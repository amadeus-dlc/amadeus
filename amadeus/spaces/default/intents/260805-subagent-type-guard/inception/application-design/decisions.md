# Application Design — Decisions(ADR)

**上流入力(consumes 全数)**: `requirements`(Open questions 1〜7 が本書の ADR-1〜ADR-7 の議題そのもの。FR/AC/CON は各 ADR の Context に引用)/ codekb `architecture`(既存 seam の現在断面 — 各 ADR の Alternatives 実在確認の出典)/ codekb `component-inventory`(既存ツール構成 — ADR-6 の再利用判断の出典)

**測定 ref**: observed `7060956c5617125dd2f4e284957aa180cb306484`

## ADR-1: 警告の出力面 = 同一イベントの `Type Verdict` 属性 + stderr advisory(Open questions 1)

- **Context**: FR-2c は出力面の確定を AD へ委譲。警告は実行結果由来・fail-open が制約。
- **Decision**: 照合結果を SUBAGENT イベント自身の optional 属性 `Type Verdict` として記録し、集合外・型未指定のときのみ hook の **stderr へ advisory 1行**(`advisory: subagent type "<value>" is outside the allowed set — see #2279`)を出す。
- **Consequences**: 集計(FR-4)は属性を読むだけで成立。stderr は「stdout=directive / stderr=advisory」の既存契約(`cid:code-generation:stdout-directive-stderr-advisory`)に整合。audit スキーマの canonical count は不変(optional 追加のみ)。
- **Alternatives Rejected**: (a) 新規 audit イベント種 `SUBAGENT_TYPE_VIOLATION` — canonical count の増加と registry 二重管理を招き、同一事象が2行に割れて集計が複雑化するため非採用。 (b) sensor 化 — sensor の filter/発火面は成果物ファイル向けで subagent seam に合わない(RE §4 の sensor filter 不適合と同型)。 (c) doctor 検査 — 事後診断であり FR-2 の「その場で可視化」を満たさない。
- **Reversibility**: **可逆(easy to change)**。optional 属性の追加は削除・改名とも registry 1行 + 配線数行の変更で戻せる。stderr advisory は出力文言の変更のみ。既存 audit 行への遡及影響なし(append-only)。

## ADR-2: 組込型台帳 = 逐語リテラル配列・完全一致・ケーシング別エントリ(Open questions 2)

- **Context**: FR-1b。組込型の正本はハーネス側で repo から observable でない。`Explore` / `explore` が別値として実測共存。
- **Decision**: C-4 を count-free の逐語リテラル配列とし、照合は**完全一致**。ケーシング違いは別エントリとして両方収載する。台帳へのコメントは各値の由来(どのハーネスで観測されたか)のみ書き、件数を書かない。
- **Consequences**: ハーネスが新しい組込型やケーシングを導入したら台帳追記が要る(advisory なので追記漏れは警告過多として顕在化し、無音では壊れない)。
- **Alternatives Rejected**: (a) lowercase 正規化での照合 — `Explore`(Claude Code)と `explore`(Codex/kimi)の**語彙 drift を不可視化**し、外部 seam 語彙の実測原則(`cid:application-design:external-seam-vocab-measurement`)に反するため非採用。 (b) ハーネス別 registry からの機械導出 — 導出元がリポジトリに存在しない(RE §4)ため構築不能。
- **Reversibility**: **可逆**。台帳は逐語配列でエントリの追加・削除が1行編集。完全一致 → 正規化写像への切替も C-2 の1関数内に閉じる(呼び手は verdict しか見ない)。

## ADR-3: 実効 model の導出 = 観測値 > 要求値 > 宣言値、source 併記(Open questions 4)

- **Context**: FR-3a が委譲した新層の位置づけ。ユーザー承認済みの解決順(明示指定 > persona ピン > セッション継承)は「取得可能な情報の順」であり、ハーネス供給値はその文面に無い。ここで「C10 裁定」とは、Issue #2279 クロスレビューの争点 C10(SUBAGENT hook payload に実効 model が載るかの機序不一致)を RE(2.1)の live probe が裁定した結果 — **model 供給はハーネス別に異なる**(Codex は payload `model` を供給、Claude Code は両 seam に不在で明示指定時の `tool_input.model` のみ)— を指す(正本: `amadeus/spaces/default/codekb/amadeus/re-scans/260805-subagent-type-guard.md` §1。requirements の AS-1〜AS-3 にも同内容を転記済み)。
- **Decision**: `resolveEffectiveModel` は **harness(payload の観測値)> request(明示指定 `tool_input.model`)> pin(persona の model ピン)** の順で解決し、どの段で解決したかを `Model Source` 属性に必ず併記する。いずれも無ければ `{ kind: "unresolved" }`。
- **Rationale**: 目的は「実効モデルの監査」(intent-statement)であり、harness 供給値は**実際に実行されたモデルの観測値**、明示指定は**要求値**にすぎない。監査では観測値が要求値に優る。一方 source 併記により要求値との食い違いは失われず、集計で「要求と観測の乖離」も検出可能。承認済み順序は「取得可能な段の列挙」として意味を保つ(request > pin はそのまま)。
- **Consequences**: Codex では harness 値が採用される。Claude Code では harness 値が無いため request > pin で解決(承認済み順序と完全一致)。AC-4 のテスト対象は4ケース(harness / request / pin / unresolved)。
- **Alternatives Rejected**: (a) 明示指定を harness 供給値より優先 — 「要求したが別のモデルで実行された」場合に**誤ったモデルを監査記録に固定**する。監査の目的(コスト・品質の実測)に反するため非採用。 (b) harness 値を捨てて承認済み3段のみ — Codex の実測供給を捨てることになり、C10 裁定(供給差を前提に組む)に反する。
- **Reversibility**: **可逆**。優先順は `resolveEffectiveModel` 1関数内の分岐順で、`Model Source` 併記により**どの順で解決したかが全 audit 行に自己記述される** — 順序を将来変更しても過去行の解釈は source 属性で一意に保たれる(情報非損失が可逆性の担保)。

## ADR-4: `gen_ai.request.model` resource への同時供給はしない(Open questions 3)

- **Context**: 宣言済み・本番供給0の休眠キー(`resource-suppliers.ts:24`)。
- **Decision**: 本 intent では供給しない。audit 属性(ADR-1/ADR-3)のみで FR-3/FR-4 を満たす。
- **Consequences**: 休眠キーは休眠のまま(現状不変)。将来 otel 面で model 別メトリクスが要る場合は `metrics-instruments.ts:102`(`gen_ai.request.model` を usage 属性で載せる既存面)の拡張が先。
- **Alternatives Rejected**: (a) 供給する — resource は**セッション粒度**で subagent 単位の粒度に合わず(1セッション複数 spawn)、意味論の混線を招く。supplier の本番配線ゼロの現状で新たな書き手を1つだけ足すと「宣言と供給の非対称」がさらに歪む。 (b) `SUPPLIED_RESOURCE_KEYS` から `gen_ai.request.model` を削除して宣言と供給を一致させる — 宣言の除去は本 intent のスコープ(#2279 の (a)(b))外の otel 契約変更であり、既存テスト(t-otel-resource-suppliers 等)の契約改訂を伴うため、別途の裁定なしには行わない。
- **Reversibility**: **可逆**。「しない」決定なので現状不変 — 将来供給する場合も supplier 呼出1行の追加で足りる。

## ADR-5: 欠落明示の表現形 = 属性不在 + 集計側 `unresolved` 区分(Open questions 5)

- **Context**: FR-3b — 空文字や "unknown" の捏造をしない。
- **Decision**: `{ kind: "unresolved" }` のとき `Model` / `Model Source` 属性を**書かない**。C-7 の集計が「Model 属性なし = unresolved」として区分・計数する。
- **Consequences**: audit 行は最小のまま。欠落の明示は集計出力(unresolved 件数の必須表示)が担う — CON-4(免責が実質基準を代替しない)は AC-4 の4ケーステスト + AC-6 の実出力で守る。
- **Alternatives Rejected**: (a) `Model: "unknown"` を書く — `normalizeAgentType` の "unknown" と同じ「捏造された既定値」を新設することになり、FR-3b が明示的に禁じる。 (b) `Model Source: "unresolved"` だけを書き `Model` を省く — 属性の片割れだけが現れる中間状態を registry 契約に増やし、read 側(C-7)の分岐を1つ増やすだけで情報量は「両方不在」と同じ。
- **Reversibility**: **可逆**。表現形の変更は C-5 の書込条件と C-7 の分類規則の同期変更で閉じる(過去行は「属性不在 = unresolved」の解釈が保存される)。

## ADR-6: 集計 = 新設の読み取り専用 CLI、COMPLETED 単独タリー(Open questions 6)

- **Context**: FR-4。`composeSubagentLifetimes` は消費者0の休眠 seam。STARTED は Claude Code で0件。
- **Decision**: `amadeus-subagent-stats.ts` を新設し、COMPLETED を一次入力に型別・verdict 別・model 別タリーを出す。STARTED があれば併記。lifetime ペアリングは採用しない。
- **Consequences**: #2303/#2297 の着地後も本 CLI はそのまま有効(STARTED 併記が自然に増える)。
- **Alternatives Rejected**: (a) `composeSubagentLifetimes` の配線 — ペアの片翼(STARTED)が実質空の現状では出力がほぼ空になり、FR-4a の「COMPLETED 単独で動作」に反する。着地後の別 intent で再評価。 (b) 既存 CLI(`amadeus-runtime.ts summary`)への追加 — 同 CLI は runtime-graph 読取で audit を読まず(RE §6)、責務が混線する。
- **Reversibility**: **可逆**。読み取り専用 CLI の新設は削除・統合とも他コンポーネントに波及しない(書込ゼロ・状態非保持)。

## ADR-7: `name:` 混入機序の live 追試は不実施(Open questions 7)

- **Context**: 要件上は不要(どの seam 由来でも集合外として警告対象)。設計入力として任意とされていた。
- **Decision**: 実施しない。ADR-1〜ADR-6 のどの決定も混入機序に依存しない(C-2 は値だけを見る)。
- **Alternatives Rejected**: (a) 実施する — probe 1本のコストに対し、結果がどちらでも設計が変わらないことが確認できたため価値が乗らない。 (b) construction まで先送りして必要になったら実施する — 「必要になる」条件が存在しない(C-2 は値のみを見る設計で、機序への依存を作らないことを本 ADR 群が確定済み)ため、先送りは未決を装った実質不実施であり、明示の不実施決定のほうが誠実。
- **Reversibility**: **可逆**。probe は record 外 scratch の read-only 実験でいつでも追加実施できる(不実施の決定は何も固定しない)。

## セキュリティ・コンプライアンス影響(全 ADR 横断)

- CXR-33(CON-1)遵守: どの決定も transcript / last_assistant_message を読まない。C-3 の入力は payload の `model` / `tool_input.model` と persona frontmatter のみ。
- advisory は情報開示を増やさない: `Type Verdict` / `Model Source` は分類ラベルであり、prompt 内容を含まない(`subagentPurposeLine` の既存 200字ラベル方針と同水準)。
- fail-open(NFR-3)は「照合の失敗が監査を止めない」ための選択であり、警告の抑制ではない — 解決関数の throw は catch して stderr へ警告し、イベント emit は継続する。
