# Business Logic Model — docs-and-parity(swarm-dispatch-enum / Issue #1157)

上流入力(consumes 全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`。追加で実依拠した上流: `decisions.md`(ADR-1/ADR-4)、U1/U2 の FD(決定表・表示契約)。

## 文書同期の写像(FR-10 / FR-9)

| 文書面 | 変更内容(正 = U1 決定表・U2 配線契約) |
|---|---|
| `docs/harness-engineering/08-construction-and-swarm.md:201-213`(driver seam 表) | 二値表 → 三値 decision table(FR-1 表と同値)+resolve 手順+breaking removal(旧 `1`)+C-15 開示。**opencode/cursor の1行言及をこの既存節へ追記**(FR-9 留保: 新規ページ・新規節を作らない) |
| `docs/reference/17-skill-system.md:108-122` §6 | 「`AMADEUS_USE_SWARM=1` selects ...」の二値記述 → 三値+loud-degrade+fail-closed の normative 契約へ置換 |
| `docs/guide/harnesses/{codex-cli,kiro-cli,kiro-ide}.md`(+`.ja.md` 対) | 各 harness の swarm 節を FR-1 の該当列と同値へ(docs-language-ownership: 対訳同期) |
| `docs/guide/harnesses/{opencode,cursor}.md`(+`.ja.md`) | 変更なし(FR-9 = 契約対象外。08 節の1行が唯一の言及) |

## 生成物同期(S-09 / C-12)

1. 正本(core/harness)確定後、`bun scripts/package.ts` で dist×6 再生成 → `bun run promote:self` で self-install ツリー同期
2. 受け入れ = `bun run dist:check`・`bun run promote:self:check` exit 0+dist 全ツリー grep で旧語彙(`ultracode`・swarm floor としての `codex exec`)0
3. 手編集は行わない(dist 手編集 Forbidden)— U1/U2 の正本変更も本 unit の再生成で dist へ届く(U1/U2 は正本+テストのみ、dist 面は本 unit に集約 — unit-of-work の c6 非交差)
