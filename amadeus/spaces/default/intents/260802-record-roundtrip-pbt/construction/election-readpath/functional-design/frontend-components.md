# Frontend Components — unit `election-readpath`(#1980)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md(参照実体は本文各節+末尾の上流参照補足。設計裁定の引用元として decisions.md / unit-of-work-dependency.md も併読した — 宣言外の追加入力)

測定 ref: **worktree HEAD `c8702be09d74daa8091d99d3eae48987b9fd7527`**。

---

## N/A — 本 unit は UI を持たない

本 unit の変更面は、components.md U1 が定める `packages/framework/core/tools/amadeus-election-store.ts` のモジュール内 private 関数1本(`parseElectionFile`)と読み口2箇所、components.md U2 が定める `tests/unit/` / `tests/integration/` の PBT、components.md U8 が定める `tests/helpers/arbitraries/` の生成器に限られる。unit-of-work.md の Unit 一覧も本 unit を「AD U1 + U2 + U8(election)」と定義しており、画面・ビュー・レンダリング面を含まない。decisions.md の4 ADR はいずれも import 流儀(ADR-1)・静的ガード述語(ADR-2)・CI ジョブ配置(ADR-3)・読み側検証の置き場(ADR-4)であり、UI 要素の裁定を含まない。unit-of-work-dependency.md の依存グラフでも本 unit は `cast-guard` / `pbt-deep-ci` の前提であって、UI を持つ unit との接続を持たない。したがって画面コンポーネント・状態管理・ルーティング・スタイルの設計対象はゼロであり、本書は「該当なし」を根拠付きで宣言する薄い書として存在する(engine の produces 実在検査のため省略しない)。

---

## 代替の出力契約(利用者に観測される面)

UI の代わりに本 unit が利用者へ提示するのは、**関数戻り値の判別ユニオン**と**既存 CLI が表示する失敗**である。以下が本 unit の「出力契約」であり、変更・不変を明示する。

### 1. 関数戻り値(一次の出力面)

| API | 契約 | 変更 |
| --- | --- | --- |
| `Store.load(root, electionId)` | `Result<{ election: Election; state: ElectionState }, StoreError>`(HEAD 実読 `:503`) | **戻り型は不変**。不正な `election.json` に対する結果が `ok` → `err("corrupt")` へ変わる |
| `Store.setState(root, electionId, state)` | `Result<void, StoreError>`(`:512`) | **戻り型は不変**。同上 |
| `parseElectionFile(raw)`(新設) | `Result<ElectionFile, StoreError>` | module-private のため利用者面には現れない |

`StoreError` の union(`:44-50`)に新しい値を追加しない(BR-ELRP-5)ため、**エラー語彙の増加による利用者面の変化はない**。

### 2. CLI 文言・exit code

本 unit は `packages/framework/core/tools/amadeus-election.ts`(CLI 面)を**変更しない**。`Store.load` の呼出は同ファイルに 8 件(component-methods.md 消費者棚卸し: `:138` `:195` `:254` `:395` `:431` `:458` `:473` `:558`)あるが、いずれも既存の `StoreError` ハンドリング経路をそのまま通る。したがって:

- **新しい文言を追加しない**。破損台帳に対しては既存の `"corrupt"` 経路の文言がそのまま出る。
- **exit code の体系を変えない**。
- 変わるのは「これまで無音で受理されていた不正な台帳が、既存の loud な失敗として現れるようになる」という**発火条件**のみである(requirements.md FR-1b「無音の部分受理を作らない」)。

この挙動変更は decisions.md ADR-4 Consequences「負(挙動変更)」が承認済みの範囲として記録しており、回復手段は人手の修復であって自動再初期化ではない(同節 + `amadeus-election-store.ts:17-18` 実文 `// prevented by tmp+rename (writeStoreFile). Parse failures of existing files` / `// reject with "corrupt" (fail-closed load; never silently re-initialize).`)。

### 3. テスト実行時の出力(検証面)

PBT が失敗したときの出力は fast-check 既定の様式(seed / replay path / 縮小反例)であり、t204 規約第2項(`tests/unit/t204-audit-escape.pbt.test.ts:16-28` の4項規約)がそのまま適用される。新しい reporter・出力形式は導入しない(BR-ELRP-14)。

### 4. 生成物(md)の構造

本 unit は record 配下に文書成果物を生成しない(台帳 `bug-scope-ledger.md` は `scope-ledger` unit の所有 — components.md U6)。

---

## 判定

**UI コンポーネント: 該当なし(0 件)。** 上記の出力契約はすべて既存面の再利用であり、新規のユーザー可視面はゼロである。

## 上流参照の補足

- 本 unit の利用者価値は unit-of-work-story-map.md 段1(破損した選挙台帳の読取時その場棄却=配布面/非対称バグの実装前検出=開発面)に対応する。
- services.md との関係: 本 unit は S1/S2 の実装に非関与だが、S2(pbt-deep-ci)のジョブ契約が「新規 PBT ファイル群」として本 unit の PBT を深掘り対象に含むため、テストファイル命名・AMADEUS_PBT_DEEP 階層は services.md S2 の実行コマンド契約から参照される。
