# Code Summary — docs-and-parity(swarm-dispatch-enum / Issue #1157)

上流入力(consumes 全数): `requirements.md`(FR-9 の1行限定・FR-10 の同期面へ trace)、`business-logic-model.md`(写像表 = 変更対象の正)、`business-rules.md`(BR-D1〜D6 受け入れ)、`domain-entities.md`(語彙は U1 からの転記のみ)、`logical-components.md`(部品表)、`reliability-design.md`(RD-D1 監査語彙2行・RD-D2 開示定型)、`scalability-design.md`(SCD-D2 count-free)、`unit-of-work.md`(U3 受け入れへ trace)。

## 実装結果(bolt branch `bolt-docs-and-parity`、commit cb4362901)

- 08-construction-and-swarm(.md/.ja.md): 三値16セル表(4列 — BR-D1 形状)+resolve 手順+breaking+C-15 開示+opencode/cursor 1行(:237 — 既存節内、新規節なし)
- 17-skill-system(.md/.ja.md): §6 三値 normative 化+:116 旧語彙撤去
- 12-state-machine(.md/.ja.md):367+audit-format.md:202: SWARM_DEGRADED 説明を三値後の事実へ(+:192 の残存 ultracode 是正)
- harness ガイド3対(codex-cli/kiro-cli/kiro-ide): FR-1 該当列と同値+codex は breaking・C-15 開示
- dist×6+self-install×4 再生成(手編集ゼロ)

## 検証(builder 実測+conductor 裏取り)

| 検証 | builder | conductor |
|---|---|---|
| typecheck/lint/dist:check/promote:self:check | 全0 | dist:check 0 |
| --ci フル | 0(376 files / 5329 assertions / 0 fail — t174/t181/t209 PASS) | — |
| 禁止6句 / count-free / ultracode / =1有効値 | 全 0 | ultracode docs+知識 0 / opencode 行実在 |
| 16セル照合 | 全セル同値(手動) | 表の三値語彙実在を grep 確認 |

## 逸脱

実装逸脱なし。builder のスコープ外観測1件(amadeus-swarm.ts:26-27 の旧 =1 コメント — U1 撤去漏れ)は leader 裁定へエスカレーション済み(intent Acceptance Boundary 上、是正必須)。
