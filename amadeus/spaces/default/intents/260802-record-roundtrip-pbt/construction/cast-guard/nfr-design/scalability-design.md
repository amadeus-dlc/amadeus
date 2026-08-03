# Scalability Design — cast-guard (#1980 / AD U4)

上流入力(consumes 全数): business-logic-model.md(補足: stage frontmatter の nfr-requirements 系5 consumes(performance/security/scalability/reliability-requirements・tech-stack-decisions)は、本 scope(self-feature)が nfr-requirements(3.2)を SKIP するため engine の解決済み directive では消費対象外 — 実 directive の consumes は business-logic-model.md の1件のみで、upstream-coverage センサーは解決済み宣言に対し全 PASSED を実測済み。性能・信頼性等の要件出典は intent 直下 requirements.md の NFR 群 — 宣言外の追加入力として本文で引用。加えて decisions.md(ADR-1〜4)・components.md・component-methods.md も宣言外の追加入力として本文で file:line 引用している)

本書は business-logic-model.md §3(初期母集団 33 サイト / 18 ファイル)・§4(処理フロー)・§6 I-6(数値の走査由来性)・I-8(事前フィルタの無害性)・§11(規模と再利用)に依拠する。宣言外の追加入力として同 unit の business-rules.md(BR-CG-7〜12 / 28)と domain-entities.md §5(台帳スキーマと初期値)を併読した。

## 測定 ref

worktree HEAD **`26fc7ddb29228757d40e3d15d6d8c0513d505f63`**。performance-design.md 冒頭と同じ差分確認により、FD の件数・file:line は HEAD で成立する。

## 1. 常駐サービス向けスケーラビリティ設計は非適用 — 何に置き換えるか

`cid:nfr-design:c1` のとおり、CLI/テスト基盤に水平スケーリング・オートスケーリング・キャッシュ層・サーキットブレーカを機械適用しない。本 unit の実体は business-logic-model.md §4 のとおり **CI ジョブ内の1プロセス・1回の走査**であり、同時実行数・スループット・レプリカ数という次元が存在しない。

置き換える記述軸は「入力規模が増えたときに、判定コストと判定の正しさがどう振る舞うか」である。本 unit で意味を持つ規模次元は3つ:

| # | 規模次元 | 現在値(HEAD 実測) | 増加要因 |
| --- | --- | --- | --- |
| D-1 | SCAN_ROOTS のルート数・ファイル数・行数 | 2 ルート / 236 ファイル / 97,154 行 | 新ルートの追加、既存ルート配下のコード増 |
| D-2 | 台帳エントリ数(file × kind) | 18 ファイル × 1 kind = 18 エントリ / 総数 33 | 母集団の増(ratchet が阻止)、`kind` 語彙の拡張(本 unit では行わない — BR-CG-48) |
| D-3 | 出力行数(残存レポート・違反行) | ファイル別内訳 18 行 | D-2 に比例 |

測定コマンドは performance-design.md §2.2 に転記済み(`find` / `wc -l` の実出力)。

## 2. D-1 の計算量 — SCAN_ROOTS 増加時の線形性

処理は business-logic-model.md §4 の SCAN → CENSUS → DIFF であり、各段の計算量は:

| 段 | 計算量 | 根拠 |
| --- | --- | --- |
| ファイル列挙 | O(ディレクトリエントリ数) | 兄弟様式 `tests/callsite-guard.ts:215` 実文 `export function listSourceFiles(root: string): string[] {` の再帰 walk。`vendor` / `node_modules` は枝ごと除外(BR-CG-10、兄弟 `:224`) |
| 構文解析 + 述語適用 | **O(Σ 各ファイルのソース長)** — 1ファイルにつき `ts.createSourceFile` 1回 + 走査1回 | decisions.md ADR-2 Decision (a)。**型解決を使わない**ためファイル間の相互参照が無く、1ファイルの解析コストは他ファイルの有無に依存しない |
| CENSUS | O(検出サイト数) | `buildCensus(matches)` の1パス |
| DIFF | O(台帳エントリ数 + census エントリ数)、各参照は Record の O(1) | 兄弟 `:170` 実文 `  return allowlist.sites[file]?.[symbol] ?? 0;` |

**線形性の核心はここにある**: 型解決(TypeChecker)を使わない設計(decisions.md ADR-2 代替 B の却下)により、走査コストはファイル集合に対して**加算的**である。ルートを1つ足しても、既存ルートの走査コストは変わらない。

## 3. ルート追加時の予算見積(推定 — 算出式を併記し、受け入れ基準には使わない)

performance-design.md §3 の償却コスト **約 3.1 μs/line**(= 0.30 秒 ÷ 97,154 行、派生値)を用いた見積:

| 想定 | 算出式 | 推定増分 |
| --- | --- | --- |
| 10,000 行のルートを追加 | 10,000 × 3.1 μs | 約 **+0.03 秒** |
| 50,000 行のルートを追加 | 50,000 × 3.1 μs | 約 **+0.16 秒** |
| 現行の 2 倍(+97,154 行) | 97,154 × 3.1 μs | 約 **+0.30 秒** |
| performance-design.md PERF-CG-3 の再検討トリガー(3 秒)に到達する規模 | 3 秒 ÷ 3.1 μs | 約 **97 万行**(現行の約 10 倍) |

いずれも**推定**であり(単一ホストの3回測定からの外挿、AST 構築コストがソース長に厳密比例するという仮定を含む)、合否判定には使わない。実際にルートを追加する変更が起きたときは、そのときの実測で判断する。

意思決定上の含意は1点のみ: **現実的なルート追加(1ルート数千〜数万行)では lint ジョブ予算(600 秒)に対する影響が計測誤差の域を出ない。** したがってスケール対応の先回り設計(分割走査・並列化・キャッシュ)は行わない。

## 4. ルート追加時に守るべき契約

SCAN_ROOTS を変更する将来の変更(本 unit では行わない)が満たすべき条件:

| # | 契約 | 理由 |
| --- | --- | --- |
| SC-1 | SCAN_ROOTS の値は単一定数から導出する(BR-CG-7。兄弟 `tests/callsite-guard.ts:61` 実文 `export const SCAN_ROOTS = ["packages/framework/core", "scripts"] as const;` と同型) | 走査範囲の定義が2箇所に分かれると、どちらが真の母集団か不明になる(domain-entities.md §4 の所有原則) |
| SC-2 | ルート追加時は同一 PR で `--update` を実行し、台帳へ新ルート分のエントリを取り込む | 取り込まないと初回 `--check` が全件 NEW_CAST になり、ratchet の履歴が読めなくなる |
| SC-3 | ルート追加は台帳値の**増加**を伴うため、BR-CG-21 のレビュー規律の対象になる。増加の由来が「走査範囲の拡大」であることを PR 本文で明示する | 増加が「新しい患部の混入」か「可視化範囲の拡大」かを、台帳 diff だけでは区別できない |
| SC-4 | `dist/` および self-install ハーネスツリーはルートに加えない(BR-CG-8) | core の投影であり、同一サイトを 7 回計上して母集団の意味を壊す |

SC-3 は本 unit の ratchet 契約が持つ**構造的な限界**である。「台帳が縮小方向にのみ動く」という不変量は、走査範囲が固定であることを前提にしている。範囲が動くと台帳値の増減は単調性の情報を失う — これを機械で判定する機構は本 unit には無い(reliability-design.md §5 の穴の表に再掲する)。

## 5. 線形性を壊す設計要素(導入禁止)

| 要素 | 壊れ方 |
| --- | --- |
| TypeChecker によるクロスファイル型解決 | プログラム全体の型解決はファイル数に対し超線形に振る舞い、236 ファイルの現状でも構文解析より桁違いに重い(decisions.md ADR-2 代替 B)。得られる追加精度は現状ゼロ(`as unknown` 8 件はすべて構文上 `unknown` キーワード) |
| ファイル間の相互参照を伴う集計(呼び出しグラフ等) | O(N²) 側へ倒れる。本 unit の述語は1ファイル内で閉じる(business-logic-model.md §2) |
| 増分走査(前回結果との差分) | 計算量は下がるが、census が全域から導出されなくなり I-6(数値の走査由来性)を破る。残存レポート(BR-CG-28)が母集団を表さなくなる |

## 6. D-2(台帳)のスケール

- 現在: 18 ファイル × 1 kind = 18 エントリ、総数 33(domain-entities.md §5.2 の実測表)。JSON としては 25〜40 行の見積(components.md U4 :42)。
- 判定コスト: サイトごとに Record 参照 O(1)、全体で O(エントリ数 + census サイズ)。台帳が数千エントリになっても判定時間は問題にならない。
- **台帳の増大は性能問題ではなく設計上の警告**である。エントリ数は可視化された負債量であり、shrink-only(BR-CG-13〜16)により単調減少する方向にしか動かない設計になっている。台帳が増えているなら、それは走査範囲の拡大(SC-3)か ratchet の破れ(BR-CG-21 の規律の失敗)のいずれかであり、性能で解く問題ではない。
- `kind` 語彙の拡張(将来 `readFileSync` 直後の無検査形など)は `Record<file, Record<kind, count>>` の形のまま収まる(decisions.md ADR-2 Consequences :125)。語彙が K 個になれば台帳エントリは最大 K 倍だが、判定コストの次数は変わらない。

## 7. D-3(出力)のスケール

残存レポートは verdict によらず毎回 stdout に出す(BR-CG-28、兄弟 `tests/callsite-guard.ts:279-280` 実文 `// The residual report BR-9 keeps visible on every run: the same shape all the` / `// way down to zero sites, so the U8 deletion gate reads one format.`)。現行のファイル別内訳は 18 行であり、CI ログの実務的な制約に対して無視できる。出力はゼロへ向かって減る方向であり、増える方向のスケール懸念は D-2 と同じ理由で「性能ではなく負債の問題」である。

出力順序は決定的である(兄弟 `:289` 実文 `  for (const file of Object.keys(census).sort()) {`)— reliability-design.md §4 の決定性と同じ機構。

## 8. 明示的な N/A(対象が存在しないことの確認)

| 一般的なスケーラビリティ関心事 | 本 unit での状態 |
| --- | --- |
| 水平スケーリング / レプリカ数 / ロードバランシング | **N/A** — 常駐サービスなし。CI ジョブ内の1プロセス |
| オートスケーリング / キャパシティプランニング | **N/A** — 同上 |
| 同時実行数 / スループット / キュー滞留 | **N/A** — 要求を受けない。起動は CI ステップ1回 |
| キャッシュ層 / CDN | **N/A** — performance-design.md §8 のとおりキャッシュを持たない設計判断 |
| データ量増加(DB / ストレージ) | **N/A** — 永続化するのは台帳 JSON(数十行)とレポート JSON のみ |
| シャーディング / パーティショニング | **N/A** — 単一プロセス内の走査 |
| バックプレッシャ / サーキットブレーカ | **N/A** — 外部依存を呼ばない |

いずれも「検討漏れ」ではなく、実体(CI 内の read-only 静的走査 1 プロセス)に照らして対象が存在しないことの確認である。

## 上流参照の補足

- 本 unit の利用者価値は unit-of-work-story-map.md 段3(バリデータ非経由の読み戻し経路新設の CI 機械ブロック)に対応する。本書 §2〜§4 は、その価値がコードベース成長後も同じコストで維持されることの設計面の裏付けである。
