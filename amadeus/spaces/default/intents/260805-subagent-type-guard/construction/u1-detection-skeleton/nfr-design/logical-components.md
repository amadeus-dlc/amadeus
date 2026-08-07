# U1 detection-skeleton — Logical Components

**上流入力(consumes 全数)**: `business-logic-model`(モジュール構成・依存方向・エラーモデル — 本書のコンポーネント目録の導出元)。条件解決で除外された consumes(`performance-requirements` / `security-requirements` / `scalability-requirements` / `reliability-requirements` / `tech-stack-decisions`)は nfr-requirements SKIP による設計上の不在(directive の `consumes_absent` expected: true)。

**測定 ref**: observed `7060956c5617125dd2f4e284957aa180cb306484`

## 論理コンポーネント目録

| コンポーネント | 実体 | 障害ドメイン | blast radius |
|---|---|---|---|
| 照合ライブラリ(C-1/C-2/C-4) | `packages/framework/core/tools/amadeus-subagent-observability.ts`(新設・下位) | プロセス内・hook 発火単位 | 当該 hook 発火の advisory と `Type Verdict` 属性のみ(fail-open により emit は不変) |
| completed hook 配線(C-5 半面) | `core/hooks/amadeus-log-subagent.ts` の差し込み | hook プロセス(短命・発火ごと独立) | 当該 SUBAGENT_COMPLETED 行1件 |
| registry 宣言(C-6 半面) | `core/otel/event-registry.ts` の optional 追加 | compile 時(宣言のみ) | ゼロ(optional は読み手非破壊) |
| 許可集合データ | `.claude/agents/*.md`(既存・読取のみ) | FS 読取(発火ごと再読) | 読取失敗時は台帳のみ照合へ縮退(warnings 可視) |

## 分離戦略と共有資源

- **依存方向の固定**: 新設モジュールが下位、既存 hook / lib が上位(business-logic-model の依存図)。新設は `amadeus-lib.ts` を import しない — 循環の構造的排除が最大の分離統制
- **状態の不在**: 全コンポーネントが無状態(キャッシュなし — business-logic-model「状態」節の「dir 読取は hook 発火ごと、キャッシュなし」)。hook プロセスは発火ごとに独立し、並行 hook 間の共有可変状態はゼロ — 分離はプロセス境界が担う
- **規模上限の引き継ぎ**(code-generation 段へ): 発火ごとの `.claude/agents/` 再読は「読取対象の規模上限は不問」という判断を含む — 現行 agents dir は十数ファイル規模で、fail-open 構造が読取遅延・失敗の影響を advisory 面に閉じ込めるため上限を設けない。この前提を実装時に暗黙化しない(kind=library により performance-design は剪定されており、コスト所在は本行が持つ)
- **共有資源**: audit シャード(append-only)への書込は既存 emit 経路の所有のまま — U1 は書込プロトコルに触れない。`.claude/agents/` は読取専用の共有データで、書き手(人間の persona 編集)との競合は「その発火時点の内容を読む」ことで許容(検査は advisory であり、最悪でも1発火分の分類が古いだけ)

## 障害ドメインの遮断点

business-logic-model のエラーモデル表を配置面へ写す:

1. **FS 層の失敗**(agents dir 不在・読取失敗)→ 照合ライブラリ内で warnings へ縮退 — hook 本体へ波及しない
2. **分類層の失敗**(予期せぬ throw)→ hook 側の外周 catch(X 経路)で吸収 — emit へ波及しない
3. **emit 層**は U1 の変更対象外 — 検査の全障害が emit に対して遮断される(fail-open の一方向遮断)

## インフラ設計への橋渡し

本 Unit はローカル CLI/hook のみでインフラ資源を持たない — スケーリング・負荷分散・配備単位は N/A(dist 投影は既存の `bun run build` パイプラインに乗り、新しい配布面を作らない)。Infrastructure Design 段への引き継ぎ事項はなし。
