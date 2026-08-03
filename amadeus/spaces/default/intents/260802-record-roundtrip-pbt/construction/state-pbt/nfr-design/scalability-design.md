# Scalability Design — unit `state-pbt` (#1980)

上流入力(consumes 全数): business-logic-model.md(§1 スコープ、§4 P-ST1〜P-ST4、§6 成果物と実行契約、§7 NFR 当たり、§8 R-2)(補足: stage frontmatter の nfr-requirements 系5 consumes(performance/security/scalability/reliability-requirements・tech-stack-decisions)は、本 scope(self-feature)が nfr-requirements(3.2)を SKIP するため engine の解決済み directive では消費対象外 — 実 directive の consumes は business-logic-model.md の1件のみで、upstream-coverage センサーは解決済み宣言に対し全 PASSED を実測済み。性能・信頼性等の要件出典は intent 直下 requirements.md の NFR 群 — 宣言外の追加入力として本文で引用)

宣言外の追加入力(同 unit の FD 兄弟成果物): business-rules.md(BR-ST-8 / BR-ST-9 / BR-ST-14 / BR-ST-16 / BR-ST-18)、domain-entities.md(§1 語彙の所有、§2 生成器構成)

測定 ref: **worktree HEAD `26fc7ddb29228757d40e3d15d6d8c0513d505f63`**。performance-design.md §5 の再確認表と同一断面。

---

## 1. 適用性の結論 — 常駐サービス向けスケーラビリティは全面 N/A

`cid:nfr-design:c1`(CLI や library の NFR 設計では、常駐 service 向けの cache・horizontal scaling・circuit breaker を機械的に適用せず、決定的な file 境界と fail-closed 契約へ置き換える)に従い、本 unit のスケーラビリティ設計は次のとおり切り分ける。

| 一般的なスケーラビリティ項目 | 判定 | 反証可能な根拠 |
| --- | --- | --- |
| 水平スケーリング / 垂直スケーリング | **N/A** | 本 unit の成果物は `bun test` が単一プロセスで完走する純関数テスト4ファイル(business-logic-model.md §6 の成果物表)。常駐プロセス・レプリカ・インスタンスの概念が存在しない |
| ロードバランシング / トラフィック分散 | **N/A** | ネットワーク境界を持たない。`// size: small` 宣言と `tests/lib/test-size.ts:36` の network シグナル非一致が drift guard で機械強制される(BR-ST-16) |
| オートスケーリング / スケーリングトリガ | **N/A** | 実行は CI ジョブ内の逐次ステップ(`tests/run-tests.ts:117` 実文 `  --ci            smoke + unit + integration`)。スケール判断を行う制御面が存在しない |
| 容量計画 / 同時接続数目標 | **N/A** | 同時接続・セッション・キューの概念を持たない |
| キャッシュ層 / CDN | **N/A**(かつ**禁止**) | 生成器はトップレベルで `fc.Arbitrary` を export する純値であり可変状態を持たない。キャッシュ導入は決定性を損なう(reliability-design.md §2.2)。§4 で明示的に禁止する |
| シャーディング / パーティショニング | **N/A**(かつ**禁止**) | performance-design.md §3.3 の派生値のとおり PR CI 階層の実行時間は**固定費支配**(固定費 ≈ 39 ms、変動費 ≈ 7.0 µs/run)であり、分割による短縮効果が構造的に存在しない |
| サーキットブレーカ / バックプレッシャ | **N/A** | 外部依存・下流サービスを持たない(依存は既存 devDependency `fast-check` のみ — `package.json:40` 実文 `    "fast-check": "^4.9.0",`) |

**したがって本書に配置図・容量計画・スケーリングポリシーは存在しない。** 代わりに、本 unit に実在する「成長軸」に対する**線形性・追随性**を設計事項として固定する(§2)。

---

## 2. 実在する成長軸と、その設計

本 unit で実際に「増える」ものは3つある。いずれも設計判断を要する。

### 2.1 軸A — 検証強度(numRuns)の成長

| 項目 | 内容 |
| --- | --- |
| 成長の形 | PR CI 階層 = 既定 100 runs → 深掘り階層(`AMADEUS_PBT_DEEP=1`)= 50,000 runs(BR-ST-14 の `OPTS` 形) |
| 設計 | **階層の分離**によって成長を吸収する。PR CI 階層の numRuns は増やさない(requirements.md FR-4c の既存規約)。強度を上げたいときは env で階層を切り替える |
| 線形性の実測 | 4プロパティ / 1ファイルの代理実装で、100 runs = **40 ms** / 50,000 runs = **391 ms**(performance-design.md §3.2 の実測転記) |
| 導出(派生値・算出式) | `v = (391 − 40) / (50000 − 100) = 351 / 49900 ≈ 0.00703 ms/run`、`C = 40 − 100v ≈ 39.3 ms`。500 倍の runs 増に対し実行時間は約 9.8 倍 — **変動費は runs に線形**で、増分が小さいのは固定費が支配的なため |
| 帰結 | 深掘り階層のコストは線形で予測可能。将来 numRuns をさらに上げても実行時間の破綻は起きない(推定: 2000 ms 予算内で単一ファイル4プロパティが許容する numRuns は約 278,000 — performance-design.md §4。**推定値であり受け入れ基準には使わない**) |

### 2.2 軸B — 対象語彙(`MIRROR_BOUNDARY_PHASES`)の成長

| 項目 | 内容 |
| --- | --- |
| 成長の形 | phase 語彙が現在の3値(`amadeus-state.ts:225` の `MIRROR_BOUNDARY_PHASES`)から増える |
| 設計 | **生成器は語彙を core から引く**(`fc.constantFrom(...MIRROR_BOUNDARY_PHASES)`)。テスト側で3値を再宣言しない(domain-entities.md §1、reliability-design.md §3.1 の二重保持禁止表) |
| 追随性 | 語彙が増えたとき、生成器は**コード変更なしに追随**する。テスト側に語彙のコピーがあると、この追随が起きず古い語彙で緑を出し続ける(= `cid:nfr-design:c3` が禁じる二重保持の同型) |
| 実行時間への影響 | **なし**。生成空間は語彙数 n に対し `3^n` 相当で増えるが、PBT は網羅ではなくサンプリングであり、実行回数は numRuns 固定。1 run あたりの生成コストは語彙数に対して定数〜線形 |
| 検証力への影響 | 生成空間が広がるため、固定 numRuns では**1点あたりの被覆率が下がる**。これは PBT の本質的な性質であり、必要なら深掘り階層(軸A)で吸収する。PR CI 階層の numRuns を上げて対処しない |

### 2.3 軸C — 受理ドメイン(`fieldValueArb`)の生成空間

| 項目 | 内容 |
| --- | --- |
| 成長の形 | 層 B の値ドメインは Unicode 文字列全体から2条件(行終端子4種の除外・`$` の除外)を引いたもの(BR-ST-8、business-logic-model.md §5) |
| 設計 | 除外は**この2条件のみ**に固定する。空文字列・前後空白・タブ・非 ASCII は残す(business-logic-model.md R-2「除外集合が広すぎるとプロパティが空洞化する」) |
| スケーラビリティ上の含意 | 除外を増やすことは実行時間の短縮手段になりうるが、**検証力の縮小と引き換え**であり、§4 で禁止する。performance-design.md §3.4 のとおり予算に約49倍の余裕があり、短縮の動機が存在しない |
| 生成コストの上限 | 文字列長は `fc.string` の既定上限に従う。長さを絞る必要が生じた場合の手当は performance-design.md §7(変動費支配時の一次手当)に規定済みで、**除外条件を増やす方向へは倒さない** |

---

## 3. 成長しない(させない)もの — 明示

| 項目 | 判定 | 根拠 |
| --- | --- | --- |
| テストファイル数 | 新規 **2**(`t418` / `t419`)で固定 | business-logic-model.md §6 の成果物表、BR-ST-18 の書込面 |
| 生成器ファイル数 | 新規 **2**(`state-receipts.ts` / `state-field.ts`)で固定。`election.ts` は他 unit の所有(domain-entities.md §3) | 同上 |
| プロパティ本数 | **4**(P-ST1〜P-ST4)で固定。新設・削除しない | business-logic-model.md §4「プロパティの新設・削除は行わない」 |
| 行数 | 合計 **200〜280 行**(機械再計算: 下限 70+70+35+25 = 200、上限 95+95+50+40 = 280) | business-logic-model.md §6、unit-of-work.md の割当と一致 |
| 新規 CI ジョブ・ランナー | **なし**。既存 `test:ci` tier へ自動的に載る | business-logic-model.md §6「新規ランナーは不要」。深掘り用 CI 面の新設は `pbt-deep-ci` unit の帰属(requirements.md FR-5a) |

---

## 4. 禁止事項(code-generation への制約)

`cid:nfr-design:c1` の趣旨どおり、スケーラビリティを名目にした機構追加を封じる。

| 禁止 | 根拠 |
| --- | --- |
| キャッシュ・メモ化・共有可変状態の導入 | 決定性を損なう(reliability-design.md §2.2)。かつ §2.1 のとおり実行時間は固定費支配で効果がない |
| 並列化・シャーディング(テスト分割による時間短縮) | 同上。加えて `cid:code-generation:fanout-load-settle-before-integration` の負荷起因偽赤リスクだけが増える |
| ワーカー・ストリーム化・遅延生成の導入 | 同上。生成器は純値であり I/O を持たない |
| 受理ドメインの除外条件を「実行時間短縮のため」に増やす | §2.3。検証力の縮小と引き換えになる。除外は行終端子4種と `$` の2条件のみ(BR-ST-8) |
| PR CI 階層の numRuns を成長に応じて動的に変える | §2.1。階層の分離が設計であり、動的化は決定性を損なう(requirements.md NFR-4) |
| phase 語彙をテスト側へコピーして「生成を速くする」 | §2.2。二重保持禁止(`cid:nfr-design:c3`、reliability-design.md §3.1) |
| `fc.pre` による事後フィルタで受理ドメインを満たす | BR-ST-9。前提充足率が入力分布に依存し、実効実行数が無音で目減りする(検証力のスケールが不定になる) |

---

## 5. 未実測として残す項目(受け入れ基準に使わない)

| 項目 | 状態 | 理由 |
| --- | --- | --- |
| `t418` / `t419` の numRuns 別実行時間(軸A の線形性の自己確認) | **未実測** | 実装後。§2.1 は代理実装の実測と、そこからの1次外挿(派生値) |
| `AMADEUS_PBT_DEEP=1` で numRuns が上がることの1回実測 | **未実施** | BR-ST-14 の検証欄。code-generation の帰属 |
| 語彙が増えたときの追随(軸B) | **将来事象**(現時点で観測不能) | 現行語彙は3値。追随性は設計(語彙を core から引く)によって担保し、実測は語彙が増えた時点の変更が行う |
