# Domain Entities — U4 clean-env-e2e

> 上流入力(consumes 全数): components(C6)、component-methods(C6 ケース表)、requirements(FR-6)、unit-of-work(U4)、unit-of-work-story-map、services(fake 境界)

## 型(テストヘルパー — tests/ 側、本番コードに型追加なし)

| 型 | 形 | 備考 |
|---|---|---|
| CleanEnv | `{ home: string; binDir: string; workspace: string; env: Record<string,string> }` | temp 合成環境のハンドル(teardown で全削除) |
| FakeCall | `{ tool: "herdr" \| "agmsg" \| "uname"; argv: string[] }` | fake ログの1行 parse 結果(観測用) |

## 不変条件

- CleanEnv は afterEach で必ず破棄(rmSync recursive)— テスト間の状態持ち越し禁止
- fake ログの parse は行単位・機械的(観測の決定性)
- 本番コード(team-up.sh / doctor / 選挙 CLI)への変更は**ゼロ** — U4 はテストのみの Unit(既存 env override 契約だけで隔離を成立させる)

## frontend-components について

UI なしのテスト Unit のため frontend-components.md は生成しない(CONDITIONAL 非該当 — 生成後に不在を確認)。
