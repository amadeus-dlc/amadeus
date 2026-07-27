# Business Rules — solo-election-surface (U2)

上流入力(consumes 全数): requirements.md(FR-02/04/08/09/10/11/12/13)、business-logic-model.md(手順論理)、decisions.md(ADR-3/4)、unit-of-work.md(U2 検証列)、components.md(t242 契約の所在)、component-methods.md(内挿4節の設計正本)、services.md(異常系の手順文脈)、unit-of-work-story-map.md(ジャーニー対応)。

## ルール一覧

| ID | ルール | 由来 | 検証 |
|---|---|---|---|
| BR-U2-1 | SKILL 内挿は既存4節のみ(節追加禁止)。t242 の BR-K1/K3/K4/FR-2b を green のまま | FR-11、ADR-3 | t242 実行 green |
| BR-U2-2 | spawn テンプレは {electionId}/{viewPath}+固定手順文のみで構成(分析・推奨・他票状態のスロットなし) | FR-02 | 新規テンプレ検査テスト(SKILL 実文の grep — 許可トークン以外の変数不在) |
| BR-U2-3 | 同期完遂文言・再spawn 1回→エスカレーションを転送節に明記 | FR-04 | テンプレ検査+文言 grep |
| BR-U2-4 | resume 再投票手順(verbatim 添付・amend・残存 5 はユーザーへ)を人間委譲節に明記 | FR-08、ADR-4 | 文言 grep |
| BR-U2-5 | 発動3類型+明示発動+対象外を起動節と team.md で同文化 | FR-09 | 両文書 grep 照合(同文比較) |
| BR-U2-6 | spawn 不能時の loud 1行告知を起動節に明記 | FR-10 | 文言 grep |
| BR-U2-7 | team.md 改定は org.md と矛盾しない加算(admission 突き合わせ) | FR-12 | code-generation で照合記録 |
| BR-U2-8 | SKILL 変更は canonical+self-install 3面+dist 3面同期、docs 該当箇所は EN/JA 同一変更 | FR-13 | dist:check / promote:self:check green |

## 検証の層配置

BR-U2-1/2/3/4/6 は SKILL 実文を読む integration 層(t242 と同型)。BR-U2-5 は team.md×SKILL の同文照合(integration)。BR-U2-8 は既存ドリフトガード。
