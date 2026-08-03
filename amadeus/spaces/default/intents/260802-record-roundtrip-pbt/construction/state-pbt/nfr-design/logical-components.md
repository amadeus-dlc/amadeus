# Logical Components — unit `state-pbt` (#1980)

上流入力(consumes 全数): business-logic-model.md(§2 対象境界の2層、§3 判定順序、§4 P-ST1〜P-ST4、§5 受理ドメイン、§6 成果物表と実行契約、§7 NFR 当たり)(補足: stage frontmatter の nfr-requirements 系5 consumes(performance/security/scalability/reliability-requirements・tech-stack-decisions)は、本 scope(self-feature)が nfr-requirements(3.2)を SKIP するため engine の解決済み directive では消費対象外 — 実 directive の consumes は business-logic-model.md の1件のみで、upstream-coverage センサーは解決済み宣言に対し全 PASSED を実測済み。性能・信頼性等の要件出典は intent 直下 requirements.md の NFR 群 — 宣言外の追加入力として本文で引用)

宣言外の追加入力(同 unit の FD 兄弟成果物): business-rules.md(BR-ST-1〜BR-ST-18)、domain-entities.md(§1 型の所有、§2 生成器、§3 cross-unit 非交差、§4 所有マップ)

測定 ref: **worktree HEAD `26fc7ddb29228757d40e3d15d6d8c0513d505f63`**。performance-design.md §5 の再確認表と同一断面。

---

## 1. 適用性の結論

本 unit は常駐サービス境界・障害ドメイン・ネットワーク境界・データストアを持たない(security-design.md §3 / scalability-design.md §1 の N/A 表)。したがって配置すべき論理**インフラ**要素(ロードバランサ・キュー・データストア等)は存在しない。

本書が固定するのは次の2つである。

1. **論理コンポーネント境界** — 本 unit が新規に所有する4ファイルと、参照するだけの既存2ファイルの責務分割線(§2)。
2. **保証機構の層別配置** — どの層が何を保証し、**何を保証しないか**(§3)。

`cid:nfr-design:c4` に従い、「本設計は構造的に保証される」という一枚岩の断定は置かない。保証は層ごとに機構が異なり、層ごとに穴の形も異なる。§3 の表はその差を明示するための表である。また `cid:nfr-design:c7` に従い、断定的インベントリ(§4 の共有資源表・§5 のブラスト半径)は §2/§3 で設計を確定させた**後**に導出している。

---

## 2. 論理コンポーネント境界

### 2.1 本 unit が新規に所有するコンポーネント

| コンポーネント | 責務 | 所有ファイル | 境界(**持たないもの**) |
| --- | --- | --- | --- |
| **T1: 層 A プロパティ**(構造フィールド) | P-ST1(正規化後の同値による round-trip)と P-ST2(5棄却分岐の否定側)を宣言する | `tests/unit/t418-state-receipts-codec.pbt.test.ts` | 正規化規則の再実装、棄却規則の再実装、生成器の定義(G1 の責務)、実 FS / spawn / network(BR-ST-16) |
| **T2: 層 B プロパティ**(テキストフィールド) | P-ST3(受理ドメイン内の条件付き round-trip)と P-ST4(受理ドメイン外のサイレント no-op 特性化)を宣言する | `tests/unit/t419-state-field-codec.pbt.test.ts` | 「フィールドが存在する」の定義、`.trim()` 意味論の変更提案、生成器の定義(G2 の責務)、実 FS / spawn / network |
| **G1: 層 A 生成器** | `receiptsArb`(受理ドメイン内の値)/ `nonConformingReceiptsTextArb`(5コンストラクタ、各1分岐へ到達) | `tests/helpers/arbitraries/state-receipts.ts` | assertion、期待値の計算、phase / status 語彙の再宣言(core から引く) |
| **G2: 層 B 生成器** | `stateContentWithFieldArb` / `stateContentWithoutFieldArb`(受理ドメインを**構成的に**満たす対)/ `fieldValueArb`(行終端子4種と `$` を除外) | `tests/helpers/arbitraries/state-field.ts` | assertion、`fc.pre` による事後フィルタ(BR-ST-9)、「フィールドが在る」の独自定義 |

シグナチャは domain-entities.md §2 が component-methods.md U8 から逐語採用した宣言をそのまま使う(追加・改名しない)。

### 2.2 本 unit が参照するだけのコンポーネント(core 正本 — 無改修)

| コンポーネント | 所有 | 本 unit の関与 |
| --- | --- | --- |
| **P1: 層 A コーデック** — `parseMirrorBoundaryReceipts`(`:239`)/ `serializeMirrorBoundaryReceipts`(`:278`)/ `MIRROR_BOUNDARY_PHASES`(`:225`) | `packages/framework/core/tools/amadeus-state.ts` | import して呼ぶだけ(BR-ST-15、BR-ST-17)。落ちる実証の一時注入面としてのみ触り、復元後の diff は空 |
| **P2: 層 B フィールドアクセサ** — `getField`(`:5179`)/ `setField`(`:5237`)/ `fieldExists`(`:5263`)/ `fieldLineRegex`(`:5255`) | `packages/framework/core/tools/amadeus-lib.ts` | 同上 |

### 2.3 依存方向(一方向であること)

```
  T1 ──uses──► G1 ──reads-vocabulary──► P1
   │                                     ▲
   └──────────────calls──────────────────┘

  T2 ──uses──► G2 ──uses-predicate──► P2
   │                                   ▲
   └────────────calls──────────────────┘
```

- **T → G → P** の一方向のみ。P から T / G への依存はない(core はテストを知らない)。
- G1 → G2、T1 → T2 の依存もない。**2つの層は完全に独立**であり、片方の赤がもう片方の解釈を変えない。
- G1 / G2 → 他 unit の `election.ts` への依存はない(domain-entities.md §3。batch 2 の非交差宣言が成立する根拠)。

---

## 3. 保証機構の層別配置(何を保証し、何を保証しないか)

一枚岩の「構造的保証」を避け、層ごとに機構と限界を並べる。

### 3.1 層 A(T1 + G1 + P1)

| 保証したい性質 | 機構 | この機構が**保証しないこと** |
| --- | --- | --- |
| 正規化後の同値(P-ST1) | メタモルフィックプロパティ(`parse ∘ serialize`)。独立オラクルを持たない | 逆向き `serialize ∘ parse = id`(BR-ST-1 で意図的に張らない)。**バイト等価**(BR-ST-2 — 順序変更は意図的に検知しない) |
| 5棄却分岐の維持(P-ST2) | 否定側プロパティ。`toThrow()` 引数なし | **どの分岐で落ちたか**(BR-ST-3 で意図的に判定しない)。5分岐すべてに到達していること(← 別機構が要る:下行) |
| 5分岐への到達 | lcov の DA 実測(BR-ST-6) | プロパティの緑では代替できない。全入力が分岐1へ吸い込まれても緑になる(reliability-design.md §3.2 F-1) |
| 語彙の追随 | G1 が `MIRROR_BOUNDARY_PHASES` を core から引く | 語彙が**減った**ときの整合(型エラーで顕在化する見込みだが本 unit の機構ではない) |
| プロパティの実効性 | 落ちる実証(BR-ST-11、reliability-design.md §4) | 実証は1回きりのスナップショット。将来のリファクタで空洞化する余地は残る(退行検出は §3.4 のプロセス層が担う) |

### 3.2 層 B(T2 + G2 + P2)

| 保証したい性質 | 機構 | この機構が**保証しないこと** |
| --- | --- | --- |
| 受理ドメイン内の round-trip(P-ST3) | 条件付きプロパティ。前提は生成器が**構成的に**満たす(`fc.pre` 不使用、BR-ST-9) | 受理ドメイン**外**の挙動(行終端子・`$` を含む値)。business-logic-model.md §5 の実測どおり round-trip は成立しない。これは記述であって欠陥の隠蔽ではない |
| サイレント no-op の固定(P-ST4) | バイト同一(`toBe(content)`) | この挙動が**望ましい**という主張(requirements.md A-2 は「本 intent では変更しない」と述べるのみ)。無音の変更を禁じるだけ(business-logic-model.md §4 P-ST4) |
| 「フィールドが存在する」の一貫性 | 判定の正本を `fieldExists` に置く(BR-ST-9)。core 側は `fieldLineRegex` を `setFieldStrict` と共有して drift を防ぐ設計(`amadeus-lib.ts:5251-5253` のコメント) | `setField` が実際に変異させる行と `fieldLineRegex` の一致(core 側の設計意図であり、本 unit はそれを崩さないだけ) |
| 値ドメインの妥当性 | 除外は2条件のみ(行終端子4種・`$`)。空文字列・空白・タブ・非 ASCII を残す(BR-ST-8) | 除外集合が**必要十分**であること。`$` の全面除外は必要条件より強い(business-logic-model.md §5 が明記した意図的な単純化) |

### 3.3 生成器層(G1 + G2)に固有の保証

| 保証したい性質 | 機構 | 保証しないこと |
| --- | --- | --- |
| 各コンストラクタが1分岐へ到達 | 生成アルファベットから `"` と `:` を除外して分岐1への逆流を構造的に断つ(domain-entities.md §2)+ コンストラクタ単体の自己検査(BR-ST-4) | 全域での到達(lcov DA が必要 — §3.1) |
| 前提の構成的充足 | `stateContentWithFieldArb` が field 行を含む content を組み立てる。生成後の `fieldExists` 自己検査は補助 | 生成された content が**現実の state ファイルに似ている**こと(似せる必要はない — 対象は純関数) |
| 決定性 | 可変状態・キャッシュ・メモ化を持たない純値 export | fast-check 内部の生成アルゴリズムの安定性(バージョン更新で分布が変わりうる — seed 固定は同一バージョン内でのみ再現を保証する) |

### 3.4 プロセス層(実装工程)の保証

コード構造では担保できず、手続きで担保する事項。

| 保証したい性質 | 機構 | 保証しないこと |
| --- | --- | --- |
| core 無改修 | `git diff --name-only <base>..HEAD -- packages/ dist/` が空(BR-ST-17) | 実装中の一時的な変更(落ちる実証の注入)。**復元後**の diff のみが判定対象 |
| 書込面の限定 | `git diff --name-only` が新規4ファイル(+ record)のみ(BR-ST-18) | worktree 外の操作(`cid:code-generation:c2` の隔離規律が別途必要) |
| 既存 example の温存 | 本 Bolt の diff に `t265-engine-boundary.test.ts` が現れない(BR-ST-7) | — |
| tNNN の一意性 | 着手時+再接地時の固定 base SHA 実測(BR-ST-12) | 並行 Bolt が同時に採番した場合(予約 `t418` / `t419` は Bolt 1 の想定 `t416` / `t417` を空けた配置。衝突時は自 Bolt 側を改番) |
| seed の非重複 | `grep -rn "PBT_SEED = " tests/`(BR-ST-13) | — |

---

## 4. 共有資源(境界を越えるもの)

§2/§3 で分割が確定したのちに導出した一覧(`cid:nfr-design:c7`)。

| 共有資源 | 共有の形 | 整合の担保 | 競合相手 |
| --- | --- | --- | --- |
| `tests/helpers/arbitraries/` ディレクトリ | 本 unit が2ファイル、`election-readpath` が `election.ts` を新設 | ファイル単位で非交差(domain-entities.md §3、BR-ST-18) | unit `election-readpath` |
| tNNN 名前空間 | repo 全体で一意 | BR-ST-12。本ステージ実測(HEAD `26fc7ddb2`)の最大値 = **415**、予約 `t418` / `t419` | 全並行 Bolt |
| `PBT_SEED` 定数の値空間 | ファイルごとに固定・相互に異なる | BR-ST-13。本ステージ実測: 既存宣言 **6箇所**・相異なる値 **5種** | 既存 PBT 4本 + `setup-plan-decisions.test.ts` |
| `test:ci` tier の実行時間 | 新規2ファイルが tier へ載る | performance-design.md §3(代理実測 41 ms)。予算 2000 ms に対し約49倍の余裕 | スイート全体 |
| test-size 分類(`// size: small`)と drift guard | 全テストファイルが同一分類器 `classifyTestSize`(`tests/lib/test-size.ts:49`)に従う | BR-ST-16。SIGNAL_PATTERNS 非一致 | 全テストファイル |
| core 正本の import 面(`packages/framework/core/tools/`) | 本 unit は読むだけ。`election-readpath` は同ディレクトリの別ファイル(`amadeus-election-store.ts` 等)を**改修する** | 対象ファイルが異なる(本 unit = `amadeus-state.ts` / `amadeus-lib.ts`)。BR-ST-17 により本 unit は書かない | unit `election-readpath` |
| 深掘り階層の実行対象集合(`AMADEUS_PBT_DEEP=1`) | 本 unit の2ファイルが後続 unit `pbt-deep-ci` の対象に入る | BR-ST-14 の `OPTS` 形を canonical(`t204-audit-escape.pbt.test.ts:38-41`)と同型にする | unit `pbt-deep-ci` |

---

## 5. ブラスト半径

§2〜§4 の確定を受けて導出する。本 unit の変更が壊しうる範囲は `tests/` の内側に閉じる(security-design.md §5 と同一の結論を、コンポーネント境界の側から述べる)。

| # | 半径 | 触れるコンポーネント | 封じ込め |
| --- | --- | --- | --- |
| 1 | T1 / T2 の赤による CI ブロック | 本 unit のみ | 決定的 seed による再現(reliability-design.md §2.1 の実測)。失敗 seed と縮小反例で切り分けが完結する |
| 2 | G1 / G2 のファイル名衝突 | `tests/helpers/arbitraries/` | ファイル単位の非交差(§4) |
| 3 | tNNN 衝突 | `tests/unit/` の名前空間 | BR-ST-12 |
| 4 | 落ちる実証の注入が復元されず残存 | P1 / P2(core) | 「赤の実測 → 復元 push 完了」を不可分1セット(reliability-design.md §4)+ BR-ST-17 の diff 空確認 |

**半径外(明示)**: 実行時のプロダクション挙動、`dist/`、self-install ツリー、engine の state / audit、他 unit の成果物。いずれも本 unit の書込面(BR-ST-18)の外にある。**もし半径外へ影響が出たら、それは「プロダクション改修なしの純追加」という前提が破れた合図**であり、実装を止めて conductor へ申告する(business-logic-model.md §7、BR-ST-17)。

---

## 6. 実装インベントリ(設計確定後の導出)

`cid:nfr-design:c7` に従い、設計が確定した本節でのみ断定的な一覧を置く。

| ファイル | 所有コンポーネント | 見積 | 層 |
| --- | --- | --- | --- |
| `tests/unit/t418-state-receipts-codec.pbt.test.ts` | T1(P-ST1 / P-ST2) | 70〜95 行 | unit(`// size: small`) |
| `tests/unit/t419-state-field-codec.pbt.test.ts` | T2(P-ST3 / P-ST4) | 70〜95 行 | unit(`// size: small`) |
| `tests/helpers/arbitraries/state-receipts.ts` | G1 | 35〜50 行 | helper |
| `tests/helpers/arbitraries/state-field.ts` | G2 | 25〜40 行 | helper |
| **合計** | | **200〜280 行**(機械再計算: 下限 70+70+35+25 = 200、上限 95+95+50+40 = 280) | |

**変更しないファイル**(参照のみ): `packages/framework/core/tools/amadeus-state.ts`、`packages/framework/core/tools/amadeus-lib.ts`、`tests/unit/t265-engine-boundary.test.ts`。

**新設しないもの**: CI ジョブ、テストランナー、npm 依存、fixture、設定ファイル(scalability-design.md §3)。

---

## 7. 未確定として残す項目

| 項目 | 状態 | 帰属 |
| --- | --- | --- |
| G1 の5コンストラクタの具体的な生成アルファベット | **未確定**(制約のみ確定: `"` と `:` を除外、null / 空 / 空白のみを生成しない) | code-generation。制約は business-logic-model.md §3 の表を正本とする |
| G2 のフィールド名候補集合 | **未確定**(制約のみ確定: 正規表現メタ文字を含む名前を混ぜる、行終端子を含む名前は生成しない) | code-generation。domain-entities.md §2 の注記が正本 |
| `PBT_SEED` の具体値 | **未確定** | code-generation(BR-ST-13 の重複確認を着手時に実施) |
| 5分岐の lcov DA | **未実測** | code-generation。coverage 実行は単独所有者による直列化が必要(`cid:code-generation:c1-coverage-single-owner`) |
