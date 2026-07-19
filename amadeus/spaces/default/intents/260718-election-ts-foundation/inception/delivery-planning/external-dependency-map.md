# External Dependency Map — election-ts-foundation

> 上流入力(consumes 全数): requirements.md、components.md、unit-of-work.md、unit-of-work-dependency.md、unit-of-work-story-map.md、team-practices.md

## 依存一覧

外部=本 intent の新設6ユニットの外にある依存。全て repo 内既存資産または既導入ツールで、第三者 SaaS・新規外部サービスへの依存はない(requirements.md NFR-1: gh 非依存)。

| 依存先 | 消費 Bolt | 性質 | 破壊時の影響と検知 |
|---|---|---|---|
| Bun ランタイム+既存 CI ゲート(typecheck/lint/tests) | 全 Bolt | 既存インフラ再利用(components.md 再利用棚卸し) | 既存 CI が loud に検知 — 追加手当不要 |
| agmsg send.sh(~/.agents/skills/agmsg/) | Bolt 3(U4)・実運用 | repo 外のユーザー環境ツール。spawn 実行のみ | 不在時は AgmsgTransport が loud エラー(exit 1)。テストはモック transport で CI 非依存化(fs-tests-integration-first の integration 層) |
| parseGoaLine / parsePmCidLine(norm-metrics.ts:688/:704) | Bolt 3(U3) | repo 内既存読み側 — テスト時 round-trip 依存のみ(実行時依存なし) | スキーマ変更時は round-trip テスト赤で検知(NFR-4: 変更要求が生じたら実装前停止) |
| contrib overlay 投影(promote-self.ts:45-46) | Bolt 5(U6) | repo 内既存機構 — 変更不要 | promote:self:check ドリフトガードが検知 |
| amadeus/spaces/<space>/elections/ ディレクトリ規約 | Bolt 1 以降(U2) | ADR-2 新設の space 資産 — .gitignore 変更不要(amadeus/ ツリーは既定 git 管理) | checkpoint コミット運用(C-07)に自然合流 |

## 非依存の明示(N/A — 反証可能な根拠付き)

- gh CLI: 選挙ツール本体は不使用(NFR-1。ノルム PR 作成は leader の既存フローで、本ツールの外)
- dist/・self-install 投影: W-04(配布外)により対象外 — dist:check への影響なし(scripts/ と contrib/ は配布面でない。ただし contrib→self-install 投影は promote:self:check の対象なので Bolt 5 で promote:self 再実行が必要)
