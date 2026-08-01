# Services / Interactions — 260801-tla-multi-model

上流入力(consumes 全数): requirements, architecture, component-inventory, team-practices

本 intent は新規サービス(常駐プロセス・ネットワーク境界)を持たない。ここでは plugin 内ツール間の**相互作用設計**(検証フロー・CI 駆動・identity 計算契約)を記す。オーケストレーションは全て短寿命 CLI の逐次呼出し(既存流儀)で、 choreography 的なイベント連携は導入しない。

## S1: loader 検証フロー(宣言 vs 解決、二重赤化)

`loadVerifiedTlaSourcesInternal` の 1 回の呼出しで以下が直列に走る(fail-fast、最初の失敗で打ち切り):

1. **map parse**(C1): schemaVersion=2、全モデルの model/cfg/(optional)auxiliaries/(optional)vocabulary を構造検証。
2. **宣言 identity 照合**: 全登録モデルの model/cfg/aux について、`verifyAssetPath`(specs/tla 境界・symlink 拒否・実ファイル検査)→ bytes 読込 → canonical identity 計算 → 宣言値と比較。不一致は SOURCE_DRIFT。
3. **推移解決との双方向照合**(RA Q2=A の検出点①): 各モデルのソースから EXTENDS/INSTANCE を推移解決(C2)し、解決集合(自己除く)と宣言 auxiliaries の path 集合を比較。
   - `resolved - declared ≠ ∅` → 宣言漏れとして SOURCE_DRIFT(detail に両集合)。
   - `declared - resolved ≠ ∅` → 過剰宣言として SOURCE_DRIFT。
4. **implementation entries 照合**(現行 verifyImplementationEntries そのまま)。

`updateModelMap` / sensor check(RA Q2=A の検出点②)は同じ C2 リゾルバで解決集合を計算し、sensor は不一致を失敗報告、updateModelMap は宣言を解決集合へ補正して identity を計算・書戻す。**検出点は二重だが抽出・解決実装は単一**(C2)——二箇所が別実装を持つと検出規則がドリフトし得るため、リゾルバを共有モジュールに置く。

```
.tla sources ──extract──> direct refs ──transitive──> resolved set ─┐
                                                                    ├─ diff ≠ ∅ → 赤
model-map.json auxiliaries ──declared set───────────────────────────┘
        ▲                                    │
        └──── updateModelMap が補正 ←────────┘ (sensor check は報告のみ)
```

## S2: CI run|verify の全モデル駆動

`run-model-check-ci.ts run --root <abs>`(既定、全登録モデル):

1. loader(C3)で全モデル検証済みソースを取得(ここで drift/宣言不一致は既に赤)。
2. model-map.json の models 配列の宣言順(parser が一意・名前昇順を強制するため宣言順=名前昇順の決定的順序、component-methods C3 と同一)に逐次、per-model で TLC 実行サブプロセスを起動(`node-ci-model-check-port.ts` の argv ビルダ経由)。語彙は model-map の vocabulary(ADR-6)から供給。
3. 各モデルの証跡を `<root>/<model-name>/` へ出力(completion marker + state 統計を含む)。
4. `verify --root <abs>` は `<root>/<model-name>/` 全件の terminal evidence を検査。1件でも欠落・不整合なら非零終了(fail-closed)。

MirrorLifecycle AsIntended は完全探索(基準: 208,628 states / 89,099 distinct / depth 18 / no error、requirements Assumptions D3)を CI で green にする(成功 i)。時間方針は measure-first(FE Q1=A): まず実測し、30 分 timeout(ci.yml:513)超過時のみ time-box 化を後続裁定する。

## S3: 資産クラス別 identity 計算契約(RA Q1=A)

| 資産クラス | domain | アルゴリズム | 計算主体 |
| --- | --- | --- | --- |
| model (.tla) | `amadeus.formal-verif.tla.module.v1` | canonical JSON → UTF-8 bytes → `sha256(domain \0 bytes)` | loader 照合 / updateModelMap 書戻し |
| cfg | `amadeus.formal-verif.tla.cfg.v1` | 同上 | 同上 |
| **aux (.tla)** | `amadeus.formal-verif.tla.module.v1`(**model と同型**) | 同上 | 同上 |
| implementation entries | (domain なし) 生 bytes の sha256 | 現行 verifyImplementationEntries どおり | loader |

aux が model と同一 domain を使う根拠: aux は TLA モジュールであり、model との区別は「どのモデルの entry にぶら下がるか」という宣言側の構造で表現される。identity の計算式自体を区別する必要はなく、同型にすることで loader と updateModelMap の計算が1関数で共有できる(RA Q1=A)。

## S4: run 系のモデル選択フロー(byte-pin)

`run-model-check.ts --model <path> --cfg <path>` の入口で:

1. C3 loader で全モデル検証 → 要求パスからモデル名を導出(`specs/tla/<Name>.tla` 形式検査、fail-closed)。
2. `bindRequestedModel`(C5)で該当モデルの verified source を選択し、要求バイトと照合(:118-123 semantics のモデル単位化)。
3. toolchain へは選択モデルの vocabulary(C4)を渡して TRACE 解析・invariant 検査を行う。

FormalElection に対しては (1)〜(3) の結果が現行と byte レベルで一致する(FR-6 pin テストの検査対象)。

## S5: ライフサイクル・スケーリング特性

全コンポーネントは短寿命 CLI(bun 実行、プロセス常駐なし)。状態は model-map.json(宣言)と `<root>/<model-name>/` 証跡(実行結果)のみで、共有メモリ・排他制御は既存のまま(tlc-spawn-planner の reservation 機構に手を入れない)。逐次実行のため TLC 並列化は導入しない(NFR-4・最小変更)。
