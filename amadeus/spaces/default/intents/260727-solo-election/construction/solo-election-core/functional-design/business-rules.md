# Business Rules — solo-election-core (U1)

上流入力(consumes 全数): requirements.md(FR-05/06/07)、business-logic-model.md(確定ロジック)、decisions.md(ADR-1/2)、unit-of-work.md(U1 の落ちる実証・regression スコープ = BR の検証列)、unit-of-work-story-map.md(BR-U1-8 のジャーニー対応)、components.md(検証対象テストの所在 t234/t244)、component-methods.md(BR-U1-6 の解決語彙の設計正本)、services.md(BR-U1-8 のシーケンス)。

## ルール一覧

| ID | ルール | 由来 | 検証 |
|---|---|---|---|
| BR-U1-1 | 2体選挙で GoA 5 が1票以上 → discussion-needed hold | FR-05(i) | t234 追加ケース+落ちる実証({5,1} が修正前 established) |
| BR-U1-2 | 2体選挙で GoA 4 が1票以上 → quorum-short hold(単票成立禁止) | FR-05(ii) | 同({4,1}) |
| BR-U1-3 | 2体選挙で賛成1・反対1 → split hold(同一選択肢でも) | FR-05(iii) | 同({1,7} 同一選択肢) |
| BR-U1-4 | block ≥1 の最優先は全票数帯で不変 | 既存規則 | 既存 t234 ケース維持 |
| BR-U1-5 | 3体以上の tally は bit 一致で不変 | FR-06 | 既存 t234/t244 全ケース+3〜6体代表組合せ regression |
| BR-U1-6 | split の解決語彙は adopted/rejected/reopen(block と同型)。解決は tally.json へ先に永続化 | FR-07、ADR-1 | HOLD_RESOLUTIONS 型検査+解決経路テスト |
| BR-U1-7 | 2体判定キーは election.voters.length(宣言)であり、resolved 票数・voterKind ではない | ADR-2、W-04 改訂裁定 | member 2体票での同挙動テスト(輸送非依存の実証) |
| BR-U1-8 | ソロ E2E: voterKind=subagent の2票が Ballot.parse を通過し、2-0 で established/即採用、record 固定 | FR-01/03 | 新規 solo loop integration テスト+実選挙スケルトン |

## 検証の層配置

BR-U1-1〜7 の unit 検証は t234(純関数 tally — unit 層)へ、BR-U1-8 の実 FS/CLI 検証は integration 層の新規テストへ置く(cid:code-generation:fs-tests-integration-first)。落ちる実証は「テストが実際に読む面」= canonical model への直接 import(in-process、cid:code-generation:injection-surface-verify)。
