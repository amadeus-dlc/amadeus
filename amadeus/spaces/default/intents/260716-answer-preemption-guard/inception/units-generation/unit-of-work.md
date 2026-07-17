# Unit of Work — answer-preemption-guard(Issue #922)

上流入力(consumes 全数): `../application-design/components.md`(C-1〜C-5)、`../application-design/component-methods.md`、`../application-design/services.md`(二層防衛)、`../application-design/component-dependency.md`(依存グラフ・非交差)、`../application-design/decisions.md`(ADR-1〜5)、`../requirements-analysis/requirements.md`(FR-1〜7)。

## Unit 分割判定

**単一 Unit**(`answer-evidence-sensor`)。根拠: C-1〜C-5 は全て同一の検査機構の面(script/manifest/定数移設/宣言/テスト)であり、変更理由が完全に凝集する(1 sensor 追加)。分割は中間契約の管理コストだけを生む。

## Unit: answer-evidence-sensor

- スコープ: C-1(script)+C-2(manifest)+C-3(cutoff canonical 化)+C-4(32 stage 宣言 — E-APG-AD-DEV 裁定済み)+C-5(テスト)+dist/self-install 再生成
- 受け入れ基準: FR-1〜5 の全 AC(FR-6 は ADR-1 で design 閉包済み、FR-7 は着地後の運用)
- 検証: AC-5c の全コマンド列+落ちる実証両側(AC-4a/4b)+registry --check(ADR-5)
- 規模: 新規 〜360行+機械的 frontmatter 32行+dist 伝播(単一 Bolt)
