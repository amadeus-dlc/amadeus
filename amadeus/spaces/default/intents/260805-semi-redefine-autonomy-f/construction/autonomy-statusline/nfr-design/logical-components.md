# Logical Components — `autonomy-statusline` NFR Design(#2253)

上流入力(consumes 全数): business-logic-model.md(present — コンポーネント境界・データフロー・経路決定木の依拠元)。nfr-requirements 系 consumes(security-requirements.md / tech-stack-decisions.md ほか)は scope の SKIP により設計上不在(questions ヘッダの負方向解決を参照)。

本 Unit の論理コンポーネントは 3 つ+障害ドメイン 1 つで全数である(questions D4)。インフラ資源を持たないため、blast radius は表示 1 行に閉じる。

---

## コンポーネント台帳

| # | コンポーネント | 所在(編集正本) | 責務 | 障害ドメイン |
| --- | --- | --- | --- | --- |
| LC-1 | `autonomySegment`(純関数) | `packages/framework/core/tools/amadeus-lib.ts` | state 文字列 → bare mode 名(`""`/`"none"`/`"semi"`/`"full"`)の全域変換。business-logic-model.md 決定表の実体 | statusline hook プロセス内 |
| LC-2 | 配線 1 行(if 付き連結) | `packages/framework/core/hooks/amadeus-statusline.ts` の `output` 構築部 | LC-1 の返り値が truthy のとき ` @` を前置して連結(C14 verbatim 様式)。挿入先は経路決定木の active workflow 分岐のみ | 同上 |
| LC-3 | canonical 型束縛 | `amadeus-intent-autonomy.ts:9` の `AutonomyMode`(`import type` + literal 配列注釈) | 値域の単一定義源。canonical 側の値域変更を typecheck 赤で検出し、表示側の黙った乖離を防ぐ | コンパイル時(実行時実体なし) |

## 障害ドメインと blast radius

- **障害ドメイン**: statusline hook プロセス(`services.md` P5 — 毎プロンプト起動、non-blocking)1 つのみ。ワークフローエンジン・stop hook・監査 journal とプロセスも書込面も共有しない。
- **blast radius**: LC-1/LC-2 の欠陥の最大影響は「statusline の autonomy セグメントの誤表示・欠落」であり、認可・状態・監査へ波及する経路が存在しない(business-logic-model.md「書き手はいない」)。fail-closed 縮退(不正値 → 表示なし)により、欠陥時の既定挙動は「表示しない」側へ倒れる。
- **隔離戦略**: LC-1 を `amadeus-lib.ts` の export 純関数として隔離することで、(a) in-process テスト駆動(t448)が可能になり、(b) spawn-only の statusline ファイル内ロジックを増やさない(`cid:code-generation:seam-placement-measured-module` — FD questions D1 の執行)。

## 共有資源

| 資源 | 共有相手 | 競合の扱い |
| --- | --- | --- |
| state ファイル(読み取りのみ) | エンジン・hooks 全般 | 追加 read なし(`main()` の既存 read を再利用 — ADR-10)。読み取り断面の一貫性は既存 statusline と同一水準で、本 Unit は劣化させない |
| `amadeus-lib.ts`(関数追加先) | 全 hooks / tools | 追加は export 関数 1 本。既存シンボルの改変なし |

## インフラ非該当の明記

circuit breaker / cache / pooling / scaling / failover は**すべて非適用**(1 行理由): 本 Unit は常駐サービスでも I/O 境界でもない読み取り専用の表示純関数であり、導入根拠となる NFR が存在しない(`cid:nfr-design:c1`、questions D2)。Infrastructure Design ステージは本 scope で SKIP であり、本書が NFR 設計と実装の橋渡しの終端である。

## 適用 NFR との対応(検証手段付き)

- **NFR-4**: t448(unit 層、決定表 5 ケース)を失敗テスト先行で追加(Red 実測 → 最小実装で Green)。
- **NFR-5**: 編集正本 2 ファイル(LC-1/LC-2 の所在列)のみを編集し、`bun run build` 後に追跡ファイル不変。
- **NFR-7**: PR CI のブロッキング集合全通過(coverage 正規判定は PR CI — 配線 1 行は spawn-only で lcov 非掲載のため patch 母集団に入らない。business-logic-model.md 検証シーケンスの実測 verbatim `measuredAdded: number; // added lines present in lcov`)。
