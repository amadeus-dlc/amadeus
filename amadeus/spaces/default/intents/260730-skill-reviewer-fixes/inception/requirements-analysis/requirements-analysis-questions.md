# Requirements Analysis — 明確化質問(260730-skill-reviewer-fixes)

上流入力(consumes 全数): business-overview.md、architecture.md、code-structure.md — 質問の前提機構(#1711 の degrade 経路・produces/consumes 非対称・修正候補の制約)は architecture.md の現在節、患部配置は code-structure.md の現在節、利用者影響は business-overview.md の現在節から導出した。

真に未決の設計判断のみを問う(既決事項 — 1 Issue = 1 Bolt = 1 PR、self-fix スコープ、#1736 の修正所在 = SKILL 正本5ファイル+dist/self-install 再生成、regression-first テスト必須 — は既存規範・ユーザー指示で確定済みのため問わない)。

## Q1. #1711 の修正方式 — `{unit-name}` 未解決 directive の解決責務をどの層に置くか

背景(実測): units-generation を SKIP するスコープでは engine の degrade 分岐(amadeus-orchestrate.ts:3050-3057)が `{unit-name}` プレースホルダのまま produces を組み立て、reviewer 層(amadeus-reviewer.ts:74)の実在検査で `required review artifact is missing` になる。consumes には placeholder 逃がし(:1771-1774)があるが produces には無い非対称。現挙動はテスト(t186:351/:492、t116:380-397)とコメント(:3052「Zero behaviour change off this path」)で仕様として固定されており、どの案でも「仕様裁定+テスト契約の明示改訂」を要件に含める。

A. **engine 側で解決する(推奨)** — degrade 経路の code-generation directive 発行時に、`{unit-name}` を実在の unit ディレクトリ(`<record>/construction/` 配下)へ解決してから emit する。実在 unit が未作成・複数・不定の場合の挙動も要件で確定する。stage-protocol.md:898 の「unchanged directive JSON を reviewer へ渡す」契約と整合し、conductor 手作業回避(cid:degrade-scope-unit-dir-layout 追補の暫定運用)を恒久解消する。t186 test 5/11・t116 test 9/10 の期待値改訂を伴う(=契約変更を正面から裁定)。
B. **reviewer-runtime 側で解決する** — scopeForDirective(amadeus-reviewer-runtime.ts:224-246)で placeholder を実 unit へ解決してから実在検査にかける。既存 engine テストは無傷だが、「directive の produces は解決済みパス」という層の前提が逆転し、engine の emit する directive は壊れた形のまま恒久化する。
C. **produces にも consumes 同様の存在検査免除を入れる** — 最小 diff だが、実在しないパスのまま reviewer が走り、必須成果物の実在検証が空文化する(検証劇場 Forbidden に抵触するリスク)。非推奨。
X. Other(具体案を記載)

[Answer]: A — engine 側で解決する。degrade 経路の directive 発行時に `{unit-name}` を実在 unit ディレクトリへ解決し、一意に確定できない場合(未作成・複数)は fail-closed の明示エラーで conductor へ差し戻す(無音 fallback 禁止)。t186 test 5/11・t116 test 9/10 の期待値改訂を要件に含める。

## 裁定の記録

- Q1 はユーザーへの AskUserQuestion で裁定(選挙対象外 — テスト契約の明示改訂を含むためユーザー専権事項として直接諮問)。回答は「A: engine 側で解決 (Recommended)」。
- ユーザー承認: 2026-07-30T12:58:39Z(AskUserQuestion 回答受領直後の `date -u` 実測)
