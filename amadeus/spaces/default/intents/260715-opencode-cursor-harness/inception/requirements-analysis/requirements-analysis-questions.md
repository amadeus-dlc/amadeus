# Requirements Analysis — 明確化質問(opencode-cursor-harness)

> 上流入力: intent-statement(Success Metrics)、scope-document(In/Out 境界)、codekb の business-overview / architecture / code-structure(RE 実測、2026-07-16 diff-refresh — 「harness port 開放性の観測面」節)、team-practices(変更なし判定)。
> 既決照合(起草時): スコープ境界・到達ライン・非目標・シーケンシングは既決(intent-capture / scope-definition ゲート)。以下の3問は **いずれの既決・実測にも帰着しない真に未決のユーザー可視契約**(requirements-analysis:c3 により本ステージで確定必須)であり、エージェント選挙の対象とする。[Answer] は選挙裁定の受領後にのみ記入する(election-answer-after-ruling / no-election-judgment-gate)。
> 機構引用は起草時に実測確認済み(mechanism-cite-verify-at-draft): packages/setup/src/domain/harness.ts:9(HarnessName union)/:19-24(.all frozen array)、scripts/promote-self.ts:37-41(managedDirs = claude+codex のみ)、scripts/package.ts:68-73(discoverHarnessNames 自動発見)、amadeus-lib.ts:143/:191(harness.json 経由の open-set 解決)。

## Q1. installer 閉じ列挙(packages/setup 系5ファイル)の更新を本 intent のスコープに含めるか?

対象: RE 実測により、`scripts/package.ts` は open-set で dist/opencode/・dist/cursor/ を自動生成できるが、installer(`packages/setup/src/domain/harness.ts:9` の `HarnessName` union、`engine-layout.ts:8-12`、`reporter.ts:24-25,137`、契約テスト `tests/unit/setup-harness.test.ts:13`)は閉じ列挙のため、更新しないと `install --harness opencode` が弾かれる。Issue #626 受け入れ条件は「dist 生成できる、または生成に必要な未解決事項が明確になっている」で installer には言及がない。

- A. 含める — dist を生成するのに install できないのはユーザー可視の中途半端な状態。閉じ列挙5ファイル(+移行の amadeus-migrate.ts の要否確認)の更新と契約テスト拡張までを In とする
- B. 含めない — Issue の初期到達ラインは「--doctor / --version / basic workflow start」で、dist 生成+手動配置で検証可能。installer 対応は棚卸し結果を添えて別 Issue 起票(受け入れ条件「未解決事項の明確化」を Issue で充足)
- C. 段階: opencode のみ installer 対応に含め、Cursor は hook seam 実測結果を見てから判断
- X. Other(具体案を明記)

[Answer]: B — 含めず別 Issue 起票(選挙 E-OC7 裁定、2026-07-15T17:14:59Z 開票、B×4 全会一致、GoA 2,2,2,2)。留保転記: (i) 別 Issue に RE scan-notes の5ファイル台帳を verbatim 添付 (ii) 「install --harness opencode が弾かれる」再現実測を必須で含める (iii) requirements には dist 生成→手動配置での検証手順を受け入れ条件充足の証跡として明記

## Q2. promote:self(self-install)への新ハーネス追加は?

対象: `scripts/promote-self.ts:37-41` の managedDirs は claude+codex のみ(本 repo が dogfood するハーネス)。opencode / Cursor を本 repo の開発で dogfood する予定はない。

- A. 対象外とする — 非対応(dogfood しない)を README / harness guide に明記し、managedDirs は触らない。promote:self:check の宇宙も不変
- B. 対象化する — dist/opencode/ 等も self-install に含める
- X. Other(具体案を明記)

[Answer]: A — promote:self 対象外・非 dogfood を docs 明記(E-OC7 裁定、A×4 全票 GoA 1、留保なし)

## Q3. Cursor の hook seam(SessionStart/Stop/PostToolUse 相当)が外部実測で不在/不安定と確定した場合、要件上どう扱うか?

対象: raid-log R-1(feasibility)。audit emit 自体は engine ツール所有で hook 非依存(RE 実測)だが、hook 由来機能(heartbeat・statusline・Stop 強制・PostToolUse センサー自動発火)は再現できない可能性がある。

- A. 機能差として文書化して受け入れる — hook 由来機能は「Cursor では未対応」を README / harness guide に明記し、engine ツール直叩き(--doctor / --version / workflow start)の動作を受け入れ条件とする(Issue 非目標「機能差を隠さない」と整合)
- B. 代替実装を要件化 — wrapper スクリプト等で hook 相当を自作する(工数増・外部仕様変動リスク)
- C. Cursor port を文書化のみに降格し、実装は opencode に集中する(Issue の初期スコープ縮小 = ユーザーエスカレーション事項)
- X. Other(具体案を明記)

[Answer]: A — 機能差として文書化受け入れ(E-OC7 裁定、A×4、GoA 1,1,2,2)。留保転記: (i) 「不在/不安定の確定」は外部実測の記録を要件の前提条件とし、確定前に文書化を先行させない (ii) 文書化は「何が動き何が動かないか」の機能単位の表を受け入れ基準に含める。C(スコープ縮小)は正準リスト(4)によりユーザーエスカレーション経由が前提であることを全員確認済み
