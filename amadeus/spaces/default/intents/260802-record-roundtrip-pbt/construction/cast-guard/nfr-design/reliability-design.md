# Reliability Design — cast-guard (#1980 / AD U4)

上流入力(consumes 全数): business-logic-model.md(補足: stage frontmatter の nfr-requirements 系5 consumes(performance/security/scalability/reliability-requirements・tech-stack-decisions)は、本 scope(self-feature)が nfr-requirements(3.2)を SKIP するため engine の解決済み directive では消費対象外 — 実 directive の consumes は business-logic-model.md の1件のみで、upstream-coverage センサーは解決済み宣言に対し全 PASSED を実測済み。性能・信頼性等の要件出典は intent 直下 requirements.md の NFR 群 — 宣言外の追加入力として本文で引用。加えて decisions.md(ADR-1〜4)・components.md・component-methods.md も宣言外の追加入力として本文で file:line 引用している)

本書は business-logic-model.md §5(状態モデルと個数照合)・§6(不変量 I-1〜I-8)・§7(プロパティ P-CG-1〜8)・§8(落ちる実証の2面)・§9(CI 実行位置と共有資源)に依拠する。宣言外の追加入力として同 unit の business-rules.md(BR-CG-14〜21 / 35〜37 / 42)と domain-entities.md §4(正規化と検証の所有)を併読した。

## 測定 ref

worktree HEAD **`26fc7ddb29228757d40e3d15d6d8c0513d505f63`**。performance-design.md 冒頭と同じ差分確認により、FD の file:line は HEAD で成立する。

## 1. 本 unit における「信頼性」の定義

常駐サービスの可用性(SLO・エラーレート・MTTR)は対象が存在しないため適用しない。本 unit の信頼性は次の2性質として定義する:

- **R-A(決定性)**: 判定は入力(SCAN_ROOTS 上のソース + 台帳)だけの関数であり、同じ入力に対して同じ verdict と同じ出力を返す。
- **R-B(fail-closed 性)**: 判定に必要な情報が欠けた・壊れた場合、必ず安全側(非 0 の exit)へ倒れる。台帳を消せばゲートが黙る、という経路を持たない。

以下、この2性質を機構ごとに設計し、**機械が保証する範囲と保証しない範囲を層別に明示する**(一枚岩の「構造的保証」断定を避ける — `cid:nfr-design:c4`)。

## 2. R-B — fail-closed の実装契約

business-logic-model.md I-2(fail-closed 全域性)と BR-CG-18 / BR-CG-19 を実装契約に落とす。

### 2.1 順序契約(これが fail-closed の本体)

台帳のロードは census の解決より**必ず先**に走る。兄弟様式の実文(HEAD 実測):

```
:332   const loaded = loadAllowlistOrFail(options.allowlistPath ?? allowlistPath());
:333   if (loaded.kind === "failed") {
:334     return fail("ALLOWLIST_UNREADABLE", [loaded.detail, "Regenerate with: bun tests/callsite-guard.ts --update"]);
:336   const census = options.census ?? buildCensus(scanRepository());
```

この順序により「台帳が読めない状況で実走査の結果だけを見て 0 を返す経路」が構造的に存在しない(business-logic-model.md §5 の遷移の一方向性)。**順序が逆転すると fail-closed は成立しない**ため、これは実装上の任意ではなく契約である。

検証: `runCheck` の ALLOWLIST_UNREADABLE 分岐への到達を lcov の DA で確認する(BR-CG-19。`cid:build-and-test:error-path-reach-lcov` — 別経路が同じ exit code に到達する偽経路 green を排除する)。

### 2.2 fail-closed で受け止める条件(全 4 条件)

| 条件 | verdict | exit | 検証 |
| --- | --- | --- | --- |
| 台帳ファイルが不在 | ALLOWLIST_UNREADABLE | 1 | integration(一時ディレクトリ・不在パス) |
| JSON として不正 | 同上 | 1 | integration(壊れた本文) |
| `direction !== "shrink-only"` | 同上 | 1 | 兄弟 `:259` 実文 `  if (doc.direction !== "shrink-only") {` |
| `sites` が非オブジェクト(null / 配列 / スカラ) | 同上 | 1 | 兄弟 `:262` 実文 `  if (doc.sites === null || typeof doc.sites !== "object") {` |

4条件すべてが P-CG-6(fail-closed の全域性)の検査対象であり、**1条件でも欠けたテストは P-CG-6 を満たさない**。不在と不正を別の exit code に分けないことも契約である(domain-entities.md §4「不在と不正を別 exit にすると fail-closed の意味が割れる」)。

### 2.3 埋め込みフォールバックの禁止(`cid:nfr-design:c3`)

**ガード本体に台帳の内容(初期 33 件のエントリ)を埋め込まない。** 台帳が読めないときに内蔵の既定値へフォールバックする分岐を作らない。理由は2つあり、いずれも単独で禁止の根拠になる:

1. **fail-closed の破れ**: 内蔵フォールバックがあると、台帳を削除した PR が「内蔵値で判定されて緑」になる。§2.1 の順序契約が守っているものを、値の側から無効化する。
2. **Git 管理資産の二重保持**: 台帳はリポジトリ内のバージョン管理資産であり、失われても Git 履歴から復元できる。埋め込みコピーは drift の源にしかならない(`cid:nfr-design:c3`)。

**許容される定数との線引き**: 台帳の *内容* を持たない文字列定数(説明文・再生成コマンド案内)は本禁止の対象外である。兄弟様式は `ALLOWLIST_DESCRIPTION` をモジュールスコープ定数として持つ(`:271` 実文 `const ALLOWLIST_DESCRIPTION =` — `renderAllowlist`(`:274-275`)が `--update` 時に書き出す `description` フィールドの文言であり、判定には一切使われない)。判定に使われる値かどうかが線引きである。

回復手順は案内文言として出力に含める(BR-CG-25 の再生成コマンド案内、兄弟 `:334` の第2要素 `"Regenerate with: bun tests/callsite-guard.ts --update"` と同型)。

## 3. R-B の全域性 — 終端状態に穴が無いことの機械照合

business-logic-model.md §5 の個数照合を信頼性の観点から再掲する。終端状態 **6**(OK / OK(縮小検知)/ NEW_CAST / ALLOWLIST_UNREADABLE / USAGE_ERROR / UNEXPECTED)から exit code 値域 **{0, 1, 2}** への写像は全射であり、**どの終端も exit code 未定義にならない**。

とりわけ `UNEXPECTED`(兄弟 `:381-382` 実文 `    console.error(\`CALLSITE GUARD FAILED [UNEXPECTED]: ${(err as Error).message}\`);` / `    return 1;`)が exit **1** であることが R-B の全域性を閉じている — 想定外の例外が 0 を返す経路が無い。BR-CG-27 はこれを in-process の例外注入テストで固定する。

## 4. R-A — 決定性と flake 回避

| 非決定性の源 | 本 unit での遮断 | 実文(HEAD) |
| --- | --- | --- |
| ディレクトリ列挙順(`readdir` の順序は FS 依存) | ファイル列挙結果を **sort** する | 兄弟 `tests/callsite-guard.ts:232` 実文 `  return files.sort();` |
| 出力のキー順 | census のキーを **sort** して走る | 兄弟 `:175` / `:289` 実文 `  for (const file of Object.keys(census).sort()) {` |
| 時刻 | 純関数層に時計を持ち込まず、CLI 層が引数で注入する(domain-entities.md §4「時刻 = CLI 層」) | 兄弟 `:337` 実文 `  const report = buildResidualReport(census, new Date().toISOString());` — 純関数 `buildResidualReport(census, now)` は `now` を受け取るだけ |
| 行番号のシフト | 台帳に行番号を持たせない(I-5 / BR-CG-13)。無関係な編集で判定が変わらない | decisions.md ADR-2 Decision (b)。兄弟 `:21-25` が同じ理由を明記(`cid:code-generation:allowlist-line-pin-stale`) |
| 乱数 / 並行 / ネットワーク | いずれも使わない。走査は逐次(performance-design.md §8 で並列化を却下) | — |
| 絶対パスの混入 | リポジトリルート相対の1形へ正規化(BR-CG-12) | 兄弟 `:239` 実文 `      const rel = relative(REPO_ROOT, path);` |

PBT の固定 seed(requirements.md NFR-4)は**本 unit に非適用**である — business-logic-model.md §7 のとおり本 unit は PBT を持たない。決定性は上表の機構で達成する。

行番号非依存(I-5)は flake 回避として特に重い。本リポジトリは行ピンの stale で全 PR が偽の赤になった実測を持つ(`cid:code-generation:allowlist-line-pin-stale` / `cid:code-generation:c1-allowlist-mechanical-remap` が定める remap 手順の存在自体がその代償)。(file, kind) カウント粒度はこの失敗モードを構造的に持たない。

## 5. R-B の中核 — allowlist ratchet の縮小単調性、その保証範囲と穴

**機械が保証するのは「増加の阻止」だけである。** 層別に明示する:

| 性質 | 保証する機構 | 層 | 検証 |
| --- | --- | --- | --- |
| ある (file, kind) で実測 > 台帳値 → 必ず赤 | `diffAgainstAllowlist`(純関数)+ exit 1 | L0 純関数 + CLI | BR-CG-14 / P-CG-1(両側)。落ちる実証 面 A(常設 census 注入) |
| 台帳に無い (file, kind) の検出 → 台帳値 0 として違反扱い | 参照の既定値 0 | L0 | BR-CG-17。兄弟 `:170` 実文 `  return allowlist.sites[file]?.[symbol] ?? 0;` |
| 実測 < 台帳値(縮小)→ 緑のまま prune 案内 | `collectRemoved` 相当 | L0 + CLI | BR-CG-16 |
| **台帳の値そのものが増えないこと** | **機械では保証しない** | **人(PR レビュー)** | BR-CG-21 |
| 走査範囲(SCAN_ROOTS)が縮まないこと | 定数の値を assert する unit テスト | L0 テスト | BR-CG-7 |
| 走査範囲の拡大に伴う台帳値増加と、患部混入による増加の区別 | **機械では区別しない** | **人(PR 本文での由来明示)** | scalability-design.md SC-3 |

この非対称は設計上の既決事項であり、隠さない。`--update` は台帳を増やす方向にも書けるツールである(BR-CG-21「ツールは書けるが、その差分を含む PR はレビューで拒否する」)。ratchet の実効性は「増加が CI で止まる」ことと「台帳 diff がレビューで見える」ことの**組み合わせ**で成立しており、片方だけでは成立しない。

### 5.1 単調性を破りうる経路と緩和

| # | 破り方 | 緩和 | 残余リスク |
| --- | --- | --- | --- |
| M-1 | 台帳を手編集して値を増やし違反を吸収する | PR diff に現れる(台帳は JSON で行数が小さく、diff が読める)。BR-CG-21 のレビュー観点 | 人のレビュー依存。機械化しない(機械化するには「正当な増加」の判定が要り、走査範囲変更という正当な増加が実在するため一律禁止にできない) |
| M-2 | 述語を弱める(検出漏れを作る)変更 | ガード自身のテスト P-CG-1〜P-CG-5(多行形・入れ子括弧・安全形の除外)+ corpus sweep(BR-CG-37) | 新しい患部形(未知の構文)は述語の射程外。`kind` 語彙の拡張で対応する将来課題(BR-CG-48) |
| M-3 | SCAN_ROOTS を縮めて母集団を消す | 定数値を assert する unit テスト(BR-CG-7)が赤くなる | テスト自体の変更は M-1 と同じくレビュー依存 |
| M-4 | CI ステップを削除する | ci.yml の diff としてレビューに現れる。加えて `tests/fixtures/formal-verif-ci-baseline.sha256` の再 baseline が必要になり(§7)、変更が無音にならない | レビュー依存 |
| M-5 | `--check` を `|| true` などで無害化する | ci.yml の diff に現れる | レビュー依存 |

M-1〜M-5 のいずれも「機械で止まる」と書かないことが本節の要点である。

## 6. 落ちる実証 — 両側の実測(偽緑と偽赤の両方を潰す)

`cid:code-generation:corpus-sweep-for-new-guards` は新設ガードに**両側実測**を要求する。本 unit の対応:

| 側 | 内容 | 対応 |
| --- | --- | --- |
| 赤くなること | 面 A(常設): in-process census 注入で NEW_CAST / exit 1(BR-CG-35)。面 B(1回): 実コーパスの**実行時に評価される式**へ違反を一時注入し赤を実測 → revert(BR-CG-36) | business-logic-model.md §8。両面とも実施が完了条件で、片方の省略は認めない |
| 正当な既存データで赤くならないこと | SCAN_ROOTS 全域 `--check` が初期台帳に対して exit 0(BR-CG-37) | corpus sweep。初期台帳は `--update` 実出力から確定(BR-CG-22)、期待値 33 サイト / 18 ファイル |

面 B は `cid:code-generation:falling-proof-injection-one-set` に従い「赤の実測 → revert 完了」を不可分の1セットとする。注入面が「テストが実際に読む面」= 実コーパスであることの確認が面 B の目的であり(`cid:code-generation:injection-surface-verify`)、型注釈のみの変更は TypeScript の実行時消去により条件を満たさない(`cid:code-generation:inject-runtime-consumed-lines`)。

**面 A と面 B が検査するものは別である**: 面 A は判定ロジック(DIFF)の赤アーム、面 B は SCAN → CENSUS → DIFF の実結線。面 A だけでは走査層の配線ミス(例: SCAN_ROOTS の解決失敗で常に空 census)を検出できず、それは「常に緑」= 検証劇場になる。

## 7. 障害モードと想定挙動

| # | 障害 | 想定挙動 | 確度 |
| --- | --- | --- | --- |
| F-1 | 台帳の 4 条件いずれか | ALLOWLIST_UNREADABLE / exit 1 | 設計確定(§2.2) |
| F-2 | 走査中のファイル読取失敗(権限・レース) | 例外 → UNEXPECTED / exit 1 | 設計確定(BR-CG-27) |
| F-3 | 走査対象に構文エラーを含む `.ts` がある | **実装段で最小 fixture により実測して記録する。**(推定: `ts.createSourceFile` は診断を別途返す設計であり例外を投げず部分木を返すため、当該ファイルの検出は best-effort になり走査は継続する。この推定は未実測であり、受け入れ基準には使わない) | 未実測 |
| F-4 | `--report` の書き出し先が書けない | 例外 → UNEXPECTED / exit 1 | 設計確定(F-2 と同経路) |
| F-5 | ci.yml 編集後に baseline fixture を再 baseline し忘れる | `tests/integration/t-formal-verif-ci-workflow.integration.test.ts` が赤(**機械検出あり**) | business-logic-model.md §9 / BR-CG-42 |
| F-6 | tNNN の採番衝突(並行 intent の base 前進) | 固定 base SHA の `tests/` 実測で再確認し、衝突時は自 PR 側を改番して全参照を更新する | BR-CG-38 |

F-3 は本書で確定させない。断定的に「例外を投げない」と書くと、実装がその前提でエラー処理を省き、実際に投げた場合に走査が途中で止まる(= 母集団が欠ける = 偽緑)ためである。実装段で fixture により挙動を実測し、**どちらであっても F-2 と同じく非 0 へ倒れるか、明示的にスキップして残存レポートへその旨を出す**かを実測結果に基づいて決める。

## 8. 共有資源に起因する信頼性(直列化)

business-logic-model.md §9 のとおり、本 unit と pbt-deep-ci は `.github/workflows/ci.yml` と `tests/fixtures/formal-verif-ci-baseline.sha256` を共有するため**直列化**され、本 unit が先に着地する(BR-CG-43 / unit-of-work-dependency.md :16 / :20 / :43)。

baseline fixture は共有台帳であり、並行 PR が別々に再 baseline すると後着側が必ず衝突する(`cid:code-generation:shared-ledger-insert-collision` と同族)。直列化はこの衝突を構造的に消す措置であり、性能上の都合ではない。再 baseline 手順と「Recorded re-baselines」注記への追記(同テスト `:14-17` が仕組みを明記)は BR-CG-42 の完了条件である。

## 9. 明示的な N/A

| 一般的な信頼性設計 | 本 unit での状態 |
| --- | --- |
| 可用性 SLO / エラーバジェット | **N/A** — 利用者向けの常駐 service が存在しない(CI ジョブ内の1プロセス)。単発 run の成功を service SLO へ昇格させない |
| リトライ / バックオフ / サーキットブレーカ | **N/A** — 外部依存を呼ばない。失敗は fail-closed で即終了するのが正しい挙動 |
| フェイルオーバ / 冗長化 | **N/A** — 状態を持たない単発プロセス |
| ヘルスチェック / アラート | **N/A** — 常駐しない。異常は CI ジョブの赤として可視化される |
| データ復旧 / バックアップ | **N/A** — 永続化資産は台帳 JSON のみで、Git 履歴が復旧手段(§2.3 の二重保持禁止と同根) |

## 上流参照の補足

- 本 unit の利用者価値は unit-of-work-story-map.md 段3(バリデータ非経由の読み戻し経路新設の CI 機械ブロック)に対応する。本書 §5 の「機械が保証する範囲」は、その価値がどこまで機械化されているかの正確な境界である。
