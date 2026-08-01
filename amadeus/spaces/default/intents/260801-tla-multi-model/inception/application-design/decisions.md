# Decisions (ADR) — 260801-tla-multi-model

上流入力(consumes 全数): requirements, architecture, component-inventory, team-practices

全決定は requirements.md の確定裁定(RA Q1=A / RA Q2=A / FE Q1=A / FE Q2=A / SD Q1=A / IC Q1=A / IC Q2=C)と team-practices.md(スケルトン off)にトレースする。既存実測引用は architecture.md / component-inventory.md 現在節(observed `33e196b8`、file:line は本ワークツリーで再確認済み)に依拠。

## ADR-1: aux identity は model と同型の domain 付き canonical identity(RA Q1=A)

- **Context**: aux(補助 .tla モジュール)の identity アルゴリズムを決める必要がある(FR-1)。model は `amadeus.formal-verif.tla.module.v1`、cfg は `…tla.cfg.v1` の domain 分離(tla-model-loader-internal.ts:260-261 実測)。
- **Decision**: aux は **model と同一 domain**(`amadeus.formal-verif.tla.module.v1`)の canonical identity を使う。
- **Consequences**: loader 照合と updateModelMap 書戻しが同一関数(services.md S3)で済む。aux と model の区別は identity 式ではなく宣言構造(どのモデルの `auxiliaries` にぶら下がるか)で表現される。
- **Alternatives Rejected**: (a) 専用 domain(`…tla.aux.v1`)— 計算式の分岐が増えるだけで検出力は変わらない。(b) 生 bytes sha256 — entries と同型だが、model/cfg との一貫性(canonical 系)を崩す。
- **Reversibility**: 容易(domain 文字列1箇所)。ただし変更すると既存 pin 値が全て変わるため、変更時は map 全再計算が必要。

## ADR-2: 宣言不一致の赤化は loader + sensor/updateModelMap の二重検出(RA Q2=A)

- **Context**: 解決集合 ≠ 宣言集合をどこで検出するか(FR-2)。
- **Decision**: **loader 検証時**(常時、全登録モデルに推移解決を実行)と **sensor check / updateModelMap 時**の二箇所で赤にする。ただし抽出・解決の実装は C2 の単一モジュールに集約する。
- **Consequences**: loader だけだと map 編集→loader 実行まで検出が遅れ得る;sensor 側があるとワークフロー中に早期検出できる。実装共有により二箇所の検出規則ドリフトを防ぐ。
- **Alternatives Rejected**: (a) loader のみ — 検出が遅い。(b) sensor のみ — loader を通らない実行経路で素通しされる。(c) 二箇所に別実装 — 規則ドリフトの温床。
- **Reversibility**: 中程度(検出点の削減は容易だが、片方を外すと検出保証が弱まる)。

## ADR-3: スキーマ拡張は optional フィールドの非侵襲方式(FE Q2=A)

- **Context**: `exactObject`(amadeus-formal-verif-model-map.ts:204)は未知キーを拒否する。aux 追加で既存2モデルのパース・identity を不変に保つ必要がある(成功 iii、NFR-1)。
- **Decision**: `auxiliaries` / `vocabulary` を **optional** とし、`exactObject` の許可キー集合を「あり/なし両形」を受け入れる形へ拡張する。省略モデルは現行と byte レベルで同一のパース結果を得る。
- **Consequences**: model-map.json の既存エントリ(FormalElection)は identity 値・entries 配列・パース結果を一切変更せずに済む(変更は optional フィールドの追加のみ — Finding-1 確定どおり FormalElection へ vocabulary を追加する)。空配列は省略と区別して拒否(fail-closed の曖昧さ排除)。
- **Alternatives Rejected**: (a) 必須フィールド化(全モデルへ `auxiliaries: []` を強制)— 既存 pin 値の変更を強いり成功(iii)に抵触。(b) schemaVersion=3 — Out of scope(requirements 明記)。
- **Reversibility**: 容易(optional 追加は後方互換)。

## ADR-4: 実行対象の既定は全登録モデル、オプションで単一絞り込み(SD Q1=A)

- **Context**: `TLA_EXECUTION_MODEL_NAME`(tla-model-map.ts:52)固定の解消方法(FR-4)。
- **Decision**: loader 無引数の意味を「全登録モデルを検証して配列で返す」へ改訂し、単一モデルが必要な呼出側は `selectVerifiedModel`(または CLI の `--model <name>`)で絞る。未登録名は明示失敗(NFR-2)。
- **Consequences**: loader 無引数ピン(t-formal-verif-tla-model-loader.test.ts:10-13)は改訂対象(requirements FR-4 で裁定確定済み)。CI `run` は既定で全モデル逐次になる。
- **Alternatives Rejected**: (a) 既定を従来どおり FormalElection 単一に維持 — #1920 の本質(実行面の単一固定)を残す。(b) 並列実行 — 逐次で要件を満たし、reservation 機構への侵襲を避ける(NFR-4・最小変更)。
- **Reversibility**: 中程度(呼出側の意味変更を伴う)。

## ADR-5: TLA_NAMED_INVARIANTS はモデル別 invariant 集合へ(IC Q1=A)

- **Context**: tla-arm.ts:322-330 の7件は FormalElection 固有。MirrorLifecycle は cfg 実測で3件(TypeOK / NoCloseWithoutLandedSync / NoDuplicateCreate)。
- **Decision**: invariant 集合をモデル別に供給する(置き場所は ADR-6)。FormalElection の7件は値を一字も変えず、model-map.json の FormalElection エントリへ追加する vocabulary フィールドへ移す(identity 値・entries は不変 — ADR-3 の非侵襲 optional 拡張)。コード側の FormalElection 既定値は残さず、map を唯一の源とする。
- **Consequences**: tlc-toolchain.ts:475/:511 のグローバル定数参照を vocabulary 経由へ切替。未知 invariant 名の拒否(fail-closed)は従来どおり。語彙欠如モデルの TRACE 解析要求は明示失敗だが、登録2モデルとも vocabulary を宣言するため定常経路では発火しない。
- **Alternatives Rejected**: (a) 全モデル共通の和集合 — 偽陰性(別モデルの invariant 名を受理)を生む。(b) cfg ファイルから実行時抽出 — cfg 書式のパーサ新設になり侵襲大。
- **Reversibility**: 容易。

## ADR-6: モデル別語彙(TRACE_STATE_VARIABLES + invariant 集合)は model-map.json エントリに置く

- **Context**: FR-4 で一般化する語彙(tlc-toolchain.ts:418 の TRACE_STATE_VARIABLES、:434-436 のラベル regex、TLA_NAMED_INVARIANTS)の配置先。候補は (a) model-map エントリ、(b) per-model 別 manifest ファイル、(c) コード内レジストリ。
- **Decision**: **(a) model-map.json の optional `vocabulary` フィールド**(ADR-3 と同じ非侵襲拡張)。
- **Consequences**:
  - 正直な限定: model-map.json は宣言の**トラストアンカー**(検証済み唯一の宣言源)であって、語彙フィールド自体は drift pin の照合対象ではない。pin が照合するのは model/cfg/aux の bytes と宣言 identity であり、vocabulary だけの編集は identity 値を動かさないため drift ガードは発火しない。この「語彙変更がガードを素通りする」性質はコード内レジストリ(c)への批判と同じく (a) にも等しく当てはまる。
  - (a) を選ぶ実質的根拠は pin カバーではなく、**宣言源の単一化**(model/cfg/aux/語彙を1ファイル1スキーマで宣言し、loader が一度の検証で全消費者へ配給する)と **optional 非侵襲**(FE Q2=A、既存エントリの identity・パース不変)にある。
  - per-model manifest(b)は新規ファイル種・読込経路・検証規則の新設が必要で、NFR-4/最小変更に反する。
  - 語彙は loader の `VerifiedModelSource` に載せて toolchain へ受け渡す(component-dependency の「toolchain は map を直接読まない」規則を維持)。
  - 語彙を持たないモデル(vocabulary 省略)の TRACE 解析要求は明示失敗。登録2モデルはともに vocabulary を宣言する(Finding-1 確定)ため、この失敗は新規モデル追加時の fail-closed として機能する。
- **Alternatives Rejected**: 上記 (b)(c) — (b) は新規経路の侵襲、(c) は宣言源の分裂(map とコードの2箇所管理)の理由で却下。
- **Reversibility**: 容易(optional フィールド。ただし model/cfg identity とは別面なので移行コストは小さい)。

## ADR-7: 宣言+解決の二元管理(IC Q2=C)

- **Context**: aux を「宣言のみ」「解決のみ(宣言なし)」「宣言+解決照合」のどれにするか。
- **Decision**: **宣言(model-map.json の auxiliaries)+ 推移解決の照合**(ADR-2 と表裏)。
- **Consequences**: 宣言は pin 面(改竄検出)、解決は網羅性(宣言漏れ検出)を担う。片方だけではもう片方の欠陥クラスを検出できない。
- **Alternatives Rejected**: (a) 解決のみ自動導出 — 宣言がないと drift pin の対象集合が実行時依存になり、pin の再現性が揺らぐ。(b) 宣言のみ — MirrorLifecycleCore のような「INSTANCE されているが未宣言」を検出できない(#1921 の空洞化の再来)。
- **Reversibility**: 困難ではないが、外すと検出保証が本質的に弱まる。

## ADR-8: CI 時間方針は measure-first(FE Q1=A)

- **Context**: MirrorLifecycle AsIntended 完全探索(基準 208,628 states、D3)を ci.yml の 30 分 timeout(:513)内で回せるか未実測(#1920 verdict 留保)。
- **Decision**: まず実測して green を確認する。timeout 超過時のみ time-box 化(探索深さ・worker 数等の制限)を後続裁定とし、その場合は成功(i)の定義(完全探索)との整合を再審する。本設計では timeout 値・if 条件・permissions を変更しない。
- **Consequences**: FR-5 の AC が実測証跡を要求する。time-box になった場合は要件側の再裁定が必要(設計で勝手に緩めない)。
- **Reversibility**: 容易(計測はコストのみ)。

## ADR-9: walking skeleton は off(team-practices 確定)

- **Context**: practices-discovery で本 intent は「新規パッケージ・配布経路を伴わない brownfield plugin 拡張」と確定。
- **Decision**: 最初の Bolt を walking-skeleton にせず、機能単位の Bolt で直接実装する。
- **Consequences**: units-generation はスケルトン Bolt を生成しない。検証は各 unit の落ちる実証テスト(team-practices Testing Posture)で担う。
- **Reversibility**: 容易(工程のみ)。

## ADR-10: 不変面の固定(成功 iii の設計上の保護)

- **Context**: FR-6 — FormalElection の検証結果・frozen model receipt identity の不変。
- **Decision**: 以下を設計レベルで固定する。
  - FormalElection の model/cfg/entries 宣言値・語彙値は変更しない。model-map.json 上の変更は vocabulary フィールドの**追加**のみで、identity 値・entries 配列・パース結果は不変(ADR-3 の非侵襲 optional 拡張、FE Q2=A)。
  - `generateFrozenTlaModel` / `createFrozenTlaModelReceipt` / `hasFrozenModelOutputBinding`(tlc-toolchain.ts:492 実測)には手を入れない。frozen モデルは FormalElection 語彙のまま。
  - identity 計算アルゴリズム(canonicalIdentity)は変更しない(ADR-1 は aux の domain 選択のみで、計算式の変更ではない)。
- **receipt identity の入力列挙と不変性の確認(FR-6/NFR-1)**: frozen model receipt の入力は (1) `generateFrozenTlaModel` が生成する frozen モデル bytes(FormalElection 語彙に固定、不変)と、(2) `publicContractIdentity` = `sha256(entries の sha256 を "\n" join)`(run-model-check-source.ts:129-131 実測)のみである。vocabulary フィールドは receipt 計算のどの入力にも入らず、entries 配列も変更しないため、receipt identity は本変更の前後で byte 一致する。map bytes 全体を receipt が覆う構成ではないため緩和策は不要。
- **Consequences**: FR-6 pin テストは「変更したら落ちる」検査として据え置ける。
- **Reversibility**: —(保護対象)。
