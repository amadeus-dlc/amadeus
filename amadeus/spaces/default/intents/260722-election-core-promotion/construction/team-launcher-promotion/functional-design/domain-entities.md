# Domain Entities — U3 team-launcher-promotion

> 上流入力(consumes 全数): components(C4/C5)、component-methods(C4/C5 の契約表)、requirements(FR-3/4/8)、unit-of-work(U3)、unit-of-work-story-map、services(外部依存の境界定義)

## 型(doctor advisory 側 — TypeScript、FDM-TS スタイル)

| 型 | 形 | 備考 |
|---|---|---|
| PrereqTool | `"herdr" \| "agmsg"` | 判別 union(検査対象の閉集合) |
| PrereqStatus | `{ tool: PrereqTool; found: true; path: string } \| { tool: PrereqTool; found: false; guidance: string }` | 判別 union — found の真偽で形が変わる(無効状態表現不能) |
| PathProbe | `(cmd: string) => string \| null` | 注入 seam(実装は PATH 探索、テストは入力データ)— テスト専用分岐を本番へ置かない |

## bash 側(team-up.sh — 型なし、契約のみ)

- `require_prerequisites()`: 副作用は stderr 出力+exit のみ。検査順 = OS → herdr → agmsg(BR-3 の先行判定)
- 既存変数契約(HERDR/AGMSG_ROOT/.../TEAM_*)は一切改名・削除しない(NFR-2)

## frontend-components について

UI なしの CLI Unit のため frontend-components.md は生成しない(CONDITIONAL 非該当 — 生成後に不在を確認)。
