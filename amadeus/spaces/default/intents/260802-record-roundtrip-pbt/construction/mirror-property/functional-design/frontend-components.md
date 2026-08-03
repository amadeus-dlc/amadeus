# Frontend Components — unit `mirror-property`(U7・Could)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md(参照実体は本文各節+末尾の上流参照補足。設計裁定の引用元として decisions.md / unit-of-work-dependency.md も併読した — 宣言外の追加入力)

測定 ref: **worktree HEAD `c8702be09`**。

---

## N/A — 本 unit は UI を持たない

本 unit の成果物は property-based test 1本とその生成器 1ファイルだけであり、利用者が操作する画面・コンポーネント・ルーティング・状態管理のいずれも生じない。components.md の U7 は所在を `tests/unit/t274-amadeus-mirror-state-codec.test.ts`(既存ファイルへの追記)+ `tests/helpers/arbitraries/` と定め、種別を `test` と分類している(components.md「規模合計(数値)」表の U7 行 = 種別 `test`)。unit-of-work.md の Unit 一覧も本 unit を「テスト 60〜90行」とし、プロダクション面を持たないことを明示する — プロダクション改修は `election-readpath` の1 unit のみ(unit-of-work.md「全 Unit 共通の実装制約」)。requirements.md FR-7a も射程を「t274 の render→parse round-trip の property 版+妥当 snapshot の arbitrary」に限定しており、decisions.md の ADR-1〜4 のうち本 unit に効くのは import 流儀(ADR-1)だけで、UI 面に触れる裁定は存在しない。unit-of-work-dependency.md でも本 unit は `depends_on: []` の独立ノードで、UI を持つ下流も上流も無い。したがって本書は engine の produces 実在検査を満たすための N/A 宣言であり、以下に UI の代わりとなる出力契約を記す。

## 代替の出力契約(CLI 実行時の観測面)

利用者面は「テストランナーの出力と終了コード」である。

| 観測点 | 契約 |
| --- | --- |
| 実行コマンド | `bun test tests/unit/t274-amadeus-mirror-state-codec.test.ts`(単体)/ `bun run test:ci`(統合 tier。requirements.md FR-4b の実行到達要件) |
| 緑のとき | 追加した property が 1 テストとして計上され、既存テスト数 + 1 で `pass` すること。exit code **0** |
| 赤のとき | fast-check 既定の失敗出力に **seed / replay パス / 縮小反例**が含まれること(component-methods.md「全メソッド共通の規約(FR-4c)」第2項)。exit code **1** |
| 決定性 | 同一 seed で再実行したとき同一の反例が再現すること(requirements.md NFR-4)。seed は固定値をソース内に持つ(business-rules.md BR-MP-5) |
| 深掘り実行 | `AMADEUS_PBT_DEEP=1` を与えたとき numRuns が既定(100)から深掘り値へ切り替わること。CI 面の新設は本 unit の射程外(unit `pbt-deep-ci` が担う) |
| 時間 | 単体実行の所要が requirements.md NFR-4 の予算(新規 PBT 群合計 2 秒以内)を圧迫しないこと。実測値は PR 本文へ転記する |

## 生成物の構造(md ではなくソース)

本 unit は文書成果物を出さない(文書は unit `scope-ledger` の担当 — unit-of-work.md)。ソース側の構造契約のみを示す:

```
tests/unit/t274-amadeus-mirror-state-codec.test.ts
  … 既存 describe 群(改変しない)
  + describe("property: snapshot round-trip", …)   ← 追加はこの1ブロックのみ
        └ 直上に PBT 規約4項のコメントブロック(canonical = t204:16-28)

tests/helpers/arbitraries/mirror-snapshot.ts        ← 新規
  + 冒頭コメント(生成器の責務境界と v1 受理ドメインの絞り込み)
  + mirrorTimestampArb / mirrorEventArb / validMirrorSnapshotArb
```

## 上流参照の補足

- 本 unit の利用者価値は unit-of-work-story-map.md 段6(t274 example-based round-trip の property 一般化)に対応する。
- services.md との関係: 本 unit は S1/S2 に非関与。S2 の深掘り対象は「新規 PBT ファイル群」であり、本 unit が着手された場合はその集合に加わる(未着手なら加わらない — Could)。
