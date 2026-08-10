# Code Generation Plan — fix-2762-done-terminal

上流入力(consumes 全数): requirements.md(FR-1〜7 の正本として逐語準拠)。設計系 consumes(business-logic-model / business-rules / domain-entities / performance-design / security-design / deployment-architecture)は self-fix スコープ SKIP により不在(expected)— 代替正本は Issue #2762 クロスレビュー+RE 正本 `re-scans/260809-report-done-kind-split.md`。unit-of-work.md も units-generation SKIP により不在(expected)。

## 実装ステップ(受け入れ基準は requirements.md の逐語 — 縮小しない)

1. **FR-6(Red 先行)**: t524 に「非終端 done ack が terminal:false で terminal 完了と区別可能」+「terminal 未指定 done が validator 拒否」を先に書き、修正前コードで赤を実測(TDD Red ログ)。CLI 契約ポート(t115 様式、プロセス境界 spawn で自己参照隔離)
2. **FR-1**: `amadeus-directive.ts` の `DoneDirective`(:332-335)へ `terminal: boolean`、`DONE_FIELDS`(:474)へ要素、`FIELD_CHECKS_BY_KIND` の done row へ boolean 検査、golden sample(:1201 近傍)を同期。validator rule 3(unknown key strict、:590-594)と整合 → terminal 必須検査
3. **FR-2**: `:5382`(handleAuthorizedApprovalReport)/ `:5849`(handleReport)を既存 `isFinal`(:5298-5299 / :5674)で分岐して terminal 設定。`:5849` の reason を terminal/非終端で文言分離(terminal 時の「State advanced. Run next to continue.」誤りを是正)。判別子は committed 配列でなく isFinal(gated 最終で不十分 — RE 実測)
4. **FR-3**: 終端4サイト(:2987/:3582/:4933/:5744)= terminal:true、非終端 :5765 = terminal:false。7サイト全て terminal 明示(未設定 0 を grep)
5. **FR-4**: Stop hook(amadeus-stop.ts:932 近傍)の done allow 判定を terminal 参照へ。next 再 spawn kind 判定のバックストップ構造は不変。t121 系スタブ engine 経路へ「非終端 done を stop 誤認しない」を注入
6. **FR-5**: SKILL.md 6面(逐語同一5+pi)+docs/reference 17-skill-system(英日 :38 契約行含む)を terminal 参照契約へ同期。**件数語(ten/nine/seven)は触らない**
7. **FR-7(negative)**: 件数語ドリフト行の diff 0・VALID_KINDS 要素不変・他 directive kind 不変を機械確認
8. **検証**: typecheck / lint / build+porcelain(全ハーネス dist 投影)/ run-tests.sh --ci / patch gate。全ハーネス SKILL.md 6面の同期を build 再生成で確認
9. **配送**: Bolt PR 発行(`Refs #2762, #2764, #2661`)→ 収束スキル `github:j5ik2o-gh-pr-converge-loop` 実発動 → 収束後 conductor が pr-convergence-report.md 生成 → §12a → approve(plugin overlay 順序)

## 委任・分担

- 実装 = amadeus-builder-agent(worktree 隔離、FR 全文焼き込み)。record 書込・engine 操作は builder 禁止
- record 成果物・§12a・ゲートは conductor 所有
- **自己参照注意**: 本修正は実行中の report ループが使う契約面。固定は t115(隔離 state のプロセス境界)で行い実行時と独立化(RE 調査項目4)
