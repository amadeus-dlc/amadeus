# Component Dependency — record-roundtrip-pbt (#1980)

上流入力(consumes 全数): requirements.md(FR-1 が Bolt 1 = walking skeleton であること、FR-4 が FR-1 の後に成立すること、C-2 の正本→dist 投影方向、C-3 の walking skeleton ゲート)、architecture.md(「配置と投影の含意」節 — core/tools 改修が dist 7 面 / `dist:check` / coverage / `t258-boundary-guard` を引き込み、テストは dist へ投影されない)、component-inventory.md(対象3グループの所在 — 下記の依存行列の行と列がこの3グループに閉じることの確認)

測定 ref: **worktree HEAD `5a6f79727`**。

## 依存行列(ユニット間)

行 = 依存する側、列 = 依存される側。○ = 依存あり。

| ↓依存する / 依存される→ | U1 core 改修 | U2 election PBT | U3 state PBT | U4 静的ガード | U5 深掘り CI | U6 台帳 | U7 mirror(Could) | U8 arbitrary |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **U1** core 改修 | — | | | | | | | |
| **U2** election PBT | ○ | — | | | | | | ○ |
| **U3** state PBT | | | — | | | | | ○ |
| **U4** 静的ガード | ○ | | | — | | | | |
| **U5** 深掘り CI | | ○ | ○ | | — | | | |
| **U6** 台帳 | | | | | | — | | |
| **U7** mirror(Could) | | | | | | | — | ○ |
| **U8** arbitrary | | | | | | | | — |

**循環なし**。トポロジカル順序の一例: U8 → U1 → {U2, U3, U4, U6, U7} → U5。

行列の行と列は component-inventory.md 現在節が棚卸しした対象3グループ((1) コーデック正本 = U1、(2) テスト側 = U2/U3/U7/U8、(3) 静的ガード = U4)に、本 intent 固有の非コード面(U5 の CI 面、U6 の文書)を加えたものに一致する。同節の判断「新規コンポーネントの新設は見通しにない」のとおり、**行列に新規プロダクションコンポーネントの行は現れない**。

### 各依存の根拠

| 依存 | 種別 | 根拠 |
| --- | --- | --- |
| U2 → U1 | 機能依存(強) | FR-1c / FR-4d。fail-closed プロパティは「非適合入力が読取経路で棄却される」ことを主張するが、U1 前の `Store.load` は `readJson<ElectionFile>`(`amadeus-election-store.ts:504`)の無検査キャストで素通りするため構造的に緑にできない。逆にこれが C-1 の Red 面を与える |
| U2 → U8 | 資産依存 | `validElectionArb` / `invalidElectionFileArb` の提供元 |
| U3 → U8 | 資産依存 | `receiptsArb` / `nonConformingReceiptsTextArb` ほか |
| U4 → U1 | 順序依存(弱) | 機能上は独立だが、U1 の `parseElectionFile` 新設が SCAN_ROOTS 内の走査対象を変えうるため、U1 着地後に初期 allowlist を採ると台帳の書き直し往復が要らない。`:80` 自体は `readJson<T>` 本体の構文で U1 後も検出され続ける(初期値 33/18 不変)。**逆順でも成立するが無駄が出る**ため順序を固定する |
| U5 → U2, U3 | 意味依存 | 深掘りジョブが走らせる対象(`AMADEUS_PBT_DEEP=1` を読む新規 PBT)が存在してはじめて意味を持つ。技術的には空実行でも緑になるため、**先に置くと「検証劇場」になる**(org.md Forbidden) |
| U7 → U8 | 資産依存 | 妥当 mirror snapshot の arbitrary |

U6(台帳)は文書のみで、どのユニットにも依存せず、どのユニットからも依存されない。

## Bolt 編成への含意(delivery-planning への申し送り)

requirements.md C-3(walking skeleton は Bolt 1 単独・ゲート付き)と上記 DAG から:

- **Bolt 1(walking skeleton)** = U8(election 分)+ U1 + U2。「読み側を一本化し、その一本化を PBT で押さえる」という end-to-end スライスが1 Bolt で閉じる。プロダクション改修・投影(dist 7 面)・PBT 常駐・既知バグ再現(FR-4d)がすべてこの Bolt で1回通る。
- **Bolt 2 以降**(ゲート後): U3 + U8(state 分)/ U4 / U5 / U6 / U7。相互に非交差(下記「共有資源」参照)のため並行可能。ただし U5 は U2/U3 の後。

Bolt の粒度・並行度の最終決定は delivery-planning が行う(`cid:units-generation:c1`)。

## 通信パターンとデータフロー

サービス間の実行時通信は**存在しない**(services.md のとおり常駐サービスなし)。データフローは (a) プロセス内の関数呼び出し、(b) ファイルシステム、(c) ビルド時の投影、の3種のみである。

### (a) プロセス内: election 読取経路(U1 の変更後)

```
Store.load(root, id)            ── amadeus-election-store.ts:503
  └─ readJson<unknown>(path)    ── :71   （JSON 構文のみ。壊れていれば err("corrupt") :82）
       └─ parseElectionFile(raw)         （新設・同一ファイル private）
            ├─ Election.parse(raw)       ── amadeus-election-model.ts:100
            │     └─ parseChoices        ── :76  （空 choices 拒否 / 重複 internalNo 拒否）
            │     └─ hasDuplicates       ── :65  （重複 voter 拒否）
            └─ VALID_STATES.has(state)   ── amadeus-election-store.ts:254
  └─ Result<{election, state}, StoreError>
```

テキスト代替(Mermaid 不使用): 上記は上から下への単方向の呼び出し木であり、逆方向の依存はない。`Election.parse` は `amadeus-election-model.ts` に属し、`amadeus-election-store.ts` は既に同モジュールを import している(`:33-45` の import ブロックに `type Election` を含む)ため、**新しいモジュール間依存辺は生じない**。

同じ木を `Store.setState`(`:512`)も通る(component-methods.md の対称性の節)。

### (b) ファイルシステム

| 書き手 | ファイル | 読み手 | 検査の所在 |
| --- | --- | --- | --- |
| `writeStoreFile`(`:60`、tmp→rename) | `<electionDir>/election.json` | `Store.load` `:503` / `Store.setState` `:512` | U1 後は読み側 fail-closed |
| `serializeMirrorBoundaryReceipts`(`amadeus-state.ts:278`、正規化書き手) | state ファイルの `Mirror Boundary Receipts` フィールド | `parseMirrorBoundaryReceipts`(`:239`) | 既に fail-closed(5 throw) |
| `setField`(`amadeus-lib.ts:5237`) | state ファイルの任意フィールド行 | `getField`(`:5179`) | 実質なし(A-2 で維持) |
| U4 の `--update` | `tests/.unchecked-cast-allowlist.json` | U4 の `--check` | `parseAllowlist` 相当で fail-closed |

`scripts/amadeus-election-migrate.ts:229` は `election.json` を Store を経由せず独自に読む(実文 `      const raw = JSON.parse(readFileSync(join(dir, "election.json"), "utf8")) as Record<`)。これは U1 の一本化の**外**にあり、U4 のガード母集団として allowlist に残る。すなわち「一本化しきれていない経路が台帳上で可視になる」という3層構造(requirements.md Intent analysis)の (3) がここで働く。

### (c) ビルド時の投影(方向は一方向)

```
packages/framework/core/tools/*.ts   （正本 — C-2）
        │  bun scripts/package.ts
        ▼
dist/<harness>/…/tools/*.ts          （7 ハーネス。dist:check が同一性を守る）
        │  bun run promote:self
        ▼
セルフインストールツリー               （promote:self:check が同一性を守る）
```

テキスト代替: 正本 → dist → self-install の一方向。逆流(dist の手編集)は project.md Forbidden。architecture.md 現在節の実測「テスト側は dist へ投影されない(`find dist -type d -name tests` / `find dist -name "*.test.ts"` ともに 0 件)」により、**U2 / U3 / U4 / U7 / U8 は投影コストを一切持たない**。投影コストを負うのは U1 のみである。

## 共有資源と交差判定

並行実装時の交差(同一ファイルを2ユニットが触る)を事前に洗い出す。

| 資源 | 触るユニット | 交差 | 扱い |
| --- | --- | --- | --- |
| `packages/framework/core/tools/amadeus-election-store.ts` | U1 のみ | なし | — |
| `tests/helpers/arbitraries/` | U8(新規ファイル)、U2/U3/U7(import のみ) | なし(ファイル分割) | election / state-receipts / state-field を別ファイルにすることで U2 と U3 の並行時も非交差 |
| `tests/unit/` `tests/integration/`(新規ファイル) | U2 / U3 / U4 | なし(全て新規ファイル) | — |
| `tests/unit/t274-amadeus-mirror-state-codec.test.ts` | U7 のみ(既存ファイルへの追記) | なし | — |
| **`.github/workflows/ci.yml`** | **U4(lint ジョブへ1ステップ)+ U5(ジョブ1本)** | **あり** | 同一 PR で入れるか、直列化する。並行させると textual conflict + baseline 再計算の二重発生 |
| **`tests/fixtures/formal-verif-ci-baseline.sha256`** | **U4 + U5** | **あり** | 上と同根。ci.yml を触る変更は**必ず** baseline を書き換えるため、ci.yml を触るユニットは常に直列 |
| `tests/integration/t-formal-verif-ci-workflow.integration.test.ts`(ヘッダ注記) | U4 + U5 | あり | 同上 |
| `tests/.coverage-registry.json` | U2 / U3 / U4 / U7(新規テスト追加による再生成) | あり(統合時) | 統合時に `tests/gen-coverage-registry.ts` を再生成する定型手順を踏む(`cid:code-generation:integration-registry-regen`) |
| `tests/.coverage-patch-allowlist.json`(行ピン) | U1(core 行の増減) | **あり(実測)** | 同ファイルに `amadeus-election-store.ts` の行ピンが **2 件**実在する — `:94` `"lines": "476-477"` と `:100` `"lines": "491"`(いずれも `Store.create` の防御的 catch)。U1 の新設関数をこれらより上方(例: `ElectionFile` 型定義 `:86` の直後)へ置くと**両方が下方シフト**する。実装段で difflib 等の行マップから**全エントリを機械 remap** し、remap 後に reason 文と現行行内容の直読照合を行う(`cid:code-generation:c1-allowlist-mechanical-remap` / `cid:code-generation:allowlist-line-pin-stale`)。加えて既存レンジ内部への挿入による span 膨張がないことも確認する(`cid:code-generation:cg-allowlist-straddle-swell`)。**回避策**: 新設関数を `:503` の `Store.load` 直前ではなく `Store` オブジェクトより後方、もしくは既存ピン(`:476-477` / `:491`)より下方に置けばシフト量を減らせる。ただし remap 手順の省略根拠にはしない |

**結論**: 交差は「ci.yml 系3ファイル」と「統合時の共有台帳2つ」に限られる。U4 と U5 は ci.yml を共有するため**同一 Bolt に置くか直列化する**のが安全である。それ以外(U2 / U3 / U7)は完全に非交差で並行可能。

## 外部依存

新規の外部依存はゼロ。使用するのは既存 devDependency の `fast-check`(`package.json:40` `"fast-check": "^4.9.0"`)と `typescript`(`:42` `"typescript": "^6.0.3"`)のみ。いずれもテスト層でのみ使い、配布 framework の runtime dependency は増やさない(project.md Forbidden「利用者側の Bun-only 前提」)。
