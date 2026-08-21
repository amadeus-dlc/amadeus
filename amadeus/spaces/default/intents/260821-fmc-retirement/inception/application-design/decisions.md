# Decisions(ADR)— 260821-fmc-retirement

上流入力: `requirements.md`、`components.md`、`component-methods.md`、re-scan 記録。各 ADR は Context / Decision / Consequences / Alternatives Rejected / Security・Compliance を持つ(inception.md 様式)。

## ADR-1: 完全削除(0-plugin baseline 復元)

- **Context**: FMC は投資と成果が逆転(authoring 実使用 2 回、.tla 増減ゼロ 8/14 以降)。ユーザー裁定「再設計までは削除」。
- **Decision**: プラグイン・specs・テスト・CI・設定・docs を一括削除し、プラグイン境界(plugin composition)の設計どおり 0-plugin baseline へ戻す。エンジン側ハードコード 0 件(RE 実測)のため境界内で完結する。
- **Consequences**: 形式検証層は消滅(再設計まで)。既存 4 モデルの CI 検査も消える — team.md 二層検証ノルムの形式面は FR-NORM-1 で失効整理。将来の再設計は git 履歴(モデル・実装とも)から出発できる。
- **Alternatives Rejected**: (a) config 無効化のみ(コード温存)— 「ないほうが混乱がない」裁定に反し、休眠 16,881 行が残る。(b) 検証系のみ温存 — 同上、かつ供給なき検証系は #3186 以前の実効ゼロ状態の再現。
- **Security/Compliance**: 削除により攻撃面・依存(JDK)縮小。秘密情報なし。

## ADR-2: conformance fixture は tests/fixtures 配下の合成プラグイン

- **Context**: blocking job plugin-conformance-e2e の唯一のテスト t341 と B1 16 件が FMC 実ディレクトリを fixture に使う(O-2)。
- **Decision**: `tests/fixtures/conformance-fixture-plugin/` に完全形(plugin.json + stage + sensor + tool + advisories)の合成プラグインを新設し、全 B1 を束縛差し替え(assertion 削除 0)。梯子 AUTO_DECIDED `auto-decision-08dc84b9963cec50aff1c20d68cbbc9e`。
- **Consequences**: conformance 検査が本番プラグインの都合と分離され hermetic 化。fixture は tests 資産として本 intent が実装+配線を同時に完結(先行着地 N3 非該当)。
- **Alternatives Rejected**: (a) github-pr-convergence へ再標的 — #3382 並行作業との結合・本番プラグイン変更が conformance 期待を壊す恒常リスク。(b) t341 削除 — blocking ゲートの空洞化(禁止クラス)。
- **Security/Compliance**: fixture はダミー宣言のみ・実行系 no-op。

## ADR-3: コア advisory 機構は温存(休眠明記)

- **Context**: FMC が唯一の advisories 供給者(O-1)。コア側 1,960 行 + directive 2 種が供給者ゼロ化。
- **Decision**: コア機構は退役スコープ外として温存。A2 8 件は個別判定(温存 4 / 再分類削除 4 — component-methods §1)。休眠事実は docs へ中立表現 1 文(FR-DOC-2、リテラル禁止語彙不使用)。梯子 AUTO_DECIDED `auto-decision-53c6a4faaa9e06c34effe1742a6cc288`。
- **Consequences**: 再設計プラグインは advisory 供給を即再開できる。合成 fixture が advisories を宣言するためコア経路のテスト被覆も維持。
- **Alternatives Rejected**: (a) コアも退役 — スコープ拡大(仕様変更 = ユーザー専権)かつ 7 ハーネス面へ波及。(b) A2 全削除 — コア機構の被覆喪失(P5 surgical 違反)。
- **Security/Compliance**: 変更なし(温存)。

## ADR-4: O-5 被覆回復は「温存 1 + 代替 2」

- **Context**: class A 削除でコア側 3 unit が唯一の被覆源を失う(O-5)。coverage ratchet は shrink-only。
- **Decision**: `advisoryLatchDir` は t381 温存で被覆継続。`PluginStageError` / `amadeus-log advisory-decision` は合成 fixture 経由の代替テスト各 1 本(TDD)。
- **Consequences**: Project Coverage Gate(絶対 AND 相対)を追加 waiver なしで維持。
- **Alternatives Rejected**: (a) allowlist waiver 追加 — 実測可能な被覆を waiver で偽装(検証劇場クラス)。(b) ratchet baseline 再取得だけで通す — 相対条件は通っても意図的な被覆放棄で NFR-1 の精神に反する。
- **Security/Compliance**: なし。

## ADR-5: specs/tla 非除外宣言は正本+pin テスト同時更新

- **Context**: RE ステージ本文 `:139-140`(正本)と t2415 ×2 が specs/tla の scan 残留を相互 pin(O-3)。片側更新は必ず赤(同意述語ドリフト)。
- **Decision**: 正本(reverse-engineering.md)・amadeus-lib.ts コメント・t2415 ×2 を同一コミットで更新し、FR-DEL-1 述語(specs/tla キー)で残渣ゼロを機械確認。
- **Consequences**: RE の scan 入力契約から形式仕様レイヤが消える(将来の再設計時に再導入)。
- **Alternatives Rejected**: t2415 の skip 化 — 生きた契約の無効化(NEVER 赤無視と同族)。
- **Security/Compliance**: なし。

## ADR-6: Bolt 構成は単一 Bolt(walking-skeleton gate 付き)

- **Context**: 削除の相互依存(component-dependency の禁止逆順 4 種)。green-throughout(NFR-1)。
- **Decision**: 退役全量を Bolt 1(単一 unit `fmc-retirement`)で配送。self-feature Mandated の walking-skeleton gate を Bolt 1 に維持(ゲート実体は「合成 fixture + 差し替え後スイートの end-to-end green」)。
- **Consequences**: PR は大きい(±170 ファイル級)が中間赤ゼロ。レビューは削除 diff 中心で機械検証可能(述語群)。
- **Alternatives Rejected**: レイヤー別多 Bolt — 中間状態が構造的に赤(NFR-1 違反)、かつ multi-member 別 PR 配送は暫定禁止ノルムに抵触。
- **Security/Compliance**: なし。

## ADR-7: Project Coverage Gate 相対条件の retained-basis 拡張(承認後追補 — ユーザー裁定 A)

> 承認後追補(2026-08-21)。§12a code-generation iteration 1 BLOCKER の是正として、実装済みの逸脱へ設計根拠を遡及文書化する。裁定主体はユーザー(実 HUMAN_TURN、AskUserQuestion 回答「A) ゲート拡張(推奨)」)であり、本 ADR はその裁定の記録である。

- **Context**: 本 intent の高被覆コード削除(41 ファイル / 10,078 行 / 被覆 99.09%)により、Project Coverage Gate の相対条件(全体母集団比較)が混合効果で構造的に赤(初回 −0.6955pp)。waiver は ADR-4 で却下済みクラス。対処選択肢をユーザーへ提示し、裁定 A =「相対比較を残存ファイル母集団で再計算(削除の混合効果だけ除去、実質劣化は捕捉継続)。落ちる実証付きで本 PR に同梱」が成立。
- **Decision**: `tests/coverage-project-gate.ts` の相対条件を retained basis(baseline を head に残存するファイルへ制限して再計算)へ拡張。絶対条件は不変。per-source 読取は新設 `tests/lib/lcov-file-totals.ts` を単一定義とし、lcov と totals emit の不一致は `LCOV_TOTALS_MISMATCH` で fail-closed。
- **Consequences(blast radius)**: 本変更は intent を越えて全将来 PR のゲート意味論に効く恒久変更。削除の混合効果は除外される一方、残存コードの実質劣化・新規コードの未被覆は従来どおり捕捉(落ちる実証 (b) で注入赤を実測)。CI は base ジョブが lcov を totals と同一 run で搬送(cache key v2 繰り上げで per-file 欠落の無音 hit を防止)。
- **フォールバックの根拠(NFR-2 適合)**: 「片側の per-file 入力欠落時は従来の全体比較へフォールバック」は互換シムではなく fail-safe の選択である — 全体比較は retained 比較より**厳しい側**(削除の混合効果を除外しない)であり、赤を緑に変える経路が構造的に存在しない。入力が揃いながら矛盾する場合は fail-closed(`LCOV_TOTALS_MISMATCH`)。使用 basis は pass/fail 両出力へ明記され無音でない。
- **Alternatives Rejected**: (a) allowlist waiver — ADR-4 却下クラス(実測可能な被覆の偽装)。(b) policy 緩和(閾値・baseline 操作)— 実質劣化の検出力を恒久に下げる。(c) ゲート変更を別ガバナンス PR に分離 — 本 PR が構造赤のままマージ不能になり、裁定 A の逐語「本 PR に同梱」に反する。分離しない代償として落ちる実証 3 点(旧赤/新緑の A/B・注入赤・unit 54 pass)を同梱した。
- **Security/Compliance**: なし。
