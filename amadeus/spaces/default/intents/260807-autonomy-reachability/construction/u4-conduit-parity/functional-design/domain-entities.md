# Domain Entities — u4-conduit-parity

上流入力(consumes 全数): requirements.md(FR-5a〜5e)、components.md(C6/C7)、component-methods.md(パリティテスト契約)、unit-of-work.md(u4 境界)、unit-of-work-story-map.md(発見可能性・手順記載・CI 検出の物語3行)、services.md(C7 の read-only 検査契約)。

## 対象エンティティ(文書面 — 導線)

### ConduitSurface(導線面の集合 — C7 が discover する)

| 面 | パス | 追記内容 |
|---|---|---|
| SKILL.md 正本 6面 | `packages/framework/harness/{claude,codex,kimi,kiro,kiro-ide,pi}/skills/amadeus/SKILL.md` | `--autonomy` 起動宣言の導線(フラグ列挙への追加+宣言手順1段落) |
| commands 2面 | `packages/framework/harness/{cursor,opencode}/commands/amadeus.md` | 同上 |
| utility help | `packages/framework/core/tools/amadeus-utility.ts`(usage 文字列) | `--autonomy <none\|semi\|full>` の1行 |
| README | `README.md` | 起動フラグ列挙への追加 |
| docs 対訳 | `docs/reference/24-intent-autonomy.md` / `.ja.md` | 起動宣言節の新設(日英同時) |
| stage-protocol | `packages/framework/core/amadeus-common/protocols/stage-protocol.md` | semi の decide-question 操作段落(:135 の full 限定を補完)+:125 の既存記載と整合 |
| SKILL :248 整合 | claude SKILL.md「AUTONOMY IS NEVER INFERRED」 | 「エンジンに記録された mode による自動裁定は推論ではない(canonical audit が根拠)」の追記整合。全ハーネス対応箇所も同時 |

### ParityGuardTest(新設テスト1本 — tNNN は実装時に採番予約)

- 検査対象: 上記の面集合を glob で discover(`harness/*/skills/amadeus/SKILL.md` + `harness/*/commands/amadeus.md` — ハーネス追加で自動拡張、count-free)+固定パス4面(help/README/docs 対訳/stage-protocol)
- 述語: 各面に `--autonomy` の出現 ≥1。stage-protocol には semi の decide-question 手順段落の存在(semi 文脈語彙+`decide-question` の共起)
- 失敗様式: 欠落面のパスと欠落語彙を列挙して赤(blocking)

## 不変条件

- 文書は engine 実装の記述であり新挙動を発明しない(C6 境界)
- birth 同時宣言の手順は u2 の確定仕様(scope 名指し形で1コマンド、ask 経路は loud 拒否+案内)を記載する — u4 が u2 に依存する理由(FR-5e)
