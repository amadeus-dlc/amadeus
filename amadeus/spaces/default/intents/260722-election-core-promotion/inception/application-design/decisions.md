# Design Decisions(ADR)— チーム機能のコア昇格

> 上流入力(consumes 全数): requirements.md、architecture.md、component-inventory.md、team-practices.md

## ADR-1: 選挙エンジンを `packages/framework/core/tools/` へ配置する(FR-1e の履行)

- **Context**: 選挙 CLI 5ファイルは Bun-only・ハーネス中立(architecture.md 実測: 横断 import は amadeus-norm-metrics 1本のみ、外部プロセスは agmsg send.sh spawn のみ)。core/tools は全6ハーネス dist へ構造投影される(cid:code-generation:harness-tools-placement)
- **Decision**: core/tools 配置。選挙プロトコルはどのハーネスのチームでも同一(E-ETF-CANON で CLI が正本)であり、ハーネス中立層の定義に合致する
- **Consequences**: 全6 dist へ CLI が届く(スキル未配布の4面でも CLI 直叩きは可能 — 害なし、将来のスキル拡張の下地)。self-install は既存5面。norm-metrics への依存が同層相対に収束し境界違反が消える
- **Alternatives Rejected**: (a) **plugin 化** — plugin 機構(#1338)は stages/seams/fragments のみ合成可能で、tools/skills/memory の合成は明示的 Deferred surfaces(docs/guide/19-plugins.md)。現時点で表現不能。(b) **ハーネス表層配置** — claude+codex の2面へ重複配置することになり、canonical 1定義の原則に反する。(c) **scripts/ 残置+参照だけ配布** — 配布コピーが動かない現状の再生産
- **Security/Compliance**: 影響なし(コード同梱範囲は自リポジトリ資産のみ、外部コード取り込みなし)

## ADR-2: チーム起動系3ファイルを bash のまま core/tools へ配置する

- **Context**: RA Q2=A(bash のまま、TS 化しない — ユーザー裁定)。team-up.sh はハーネス「中立」ではなく「複数ランタイム対応」(claude/codex を起動)だが、特定1ハーネスの表層にも属さない
- **Decision**: core/tools 配置(3ファイル: team-up.sh / team-msg.sh / team-up-codex-safety-wait.ts)。配置基準は「単一ハーネス専用か否か」であり、複数ランタイム横断のセッションオーケストレーションは中立層側
- **Consequences**: 全6 dist へ投影される(kiro 等では実行対象ランタイムがないが、bash スクリプトの同梱は無害でサイズ影響も軽微)。ADR-1 と同じ配布経路に乗り配線ゼロ
- **Alternatives Rejected**: (a) **claude+codex 表層への重複配置** — 同一 bash の2面複製は drift 温床。(b) **TS 化** — 1271行の挙動同値再実装リスクに利益が見合わない(RA Q2 裁定)。(c) **kiro 系を除いた選択投影の新機構** — coreDirs への除外機構新設は本 intent の規模に不釣り合いで、要求もない
- **Security/Compliance**: prerequisite 検査追加(C4)は入力検証の強化方向。秘密情報なし

## ADR-3: スキル正本は core `skills/` に置き、claude manifest+codex emit の2点配線で2面へ限定配布する

- **Context**: RA Q4=A(スキル面は claude+codex 限定)。実測: セッションスキル4種の確立様式 = core skills/ 正本+claude manifest coreDirs 明示行+codex emit 明示リスト。出典 = 正本直読(conductor 2026-07-23): packages/framework/harness/claude/manifest.ts:51-54(verbatim :51 `{ src: "skills/amadeus-session-cost", dst: "skills/amadeus-session-cost" },`)、packages/framework/harness/codex/emit.ts:338(verbatim `for (const skill of ["amadeus-session-cost", "amadeus-replay", "amadeus-outcomes-pack", "amadeus-grilling"]) {`)。consumed codekb には未収載のため実装時に再実測必須(レビュー Critical1 対応)。他4ハーネスは各 manifest にスキル行を追加しない限り漏れない
- **Decision**: 既習様式へ完全に相乗りする(第5のセッションスキルとして amadeus-election を追加)
- **Consequences**: 配線は2行。将来の他ハーネス拡張は各 manifest への1行追加で足りる(後続 intent の道が既存機構のまま開いている)
- **Alternatives Rejected**: (a) **contrib 残置** — dist に入らず公式化にならない(現状の再生産)。(b) **runner-gen 系の新カテゴリ新設** — stage-runner ではないセッションスキルに新機構は不要(既習4種と同類)
- **引用の意味論適合(citation-semantics-check)**: 既習様式(セッションスキル4種)は read-only スキルだが、amadeus-election は選挙 store へ書き込む CLI の包装である点が意図的相違 — 配布機構の相乗りのみで、read-only 分類(audit 無発行等)の含意は**継承しない**(SKILL.md の記述で明示)

## ADR-4: E2E は fake-binary+temp 環境合成で CI 常駐、実バイナリ検証は record 補完とする

- **Context**: feasibility Q3=X(e2e テスト組み込み、手動実証却下)。herdr の実ターミナル起動は CI で不安定
- **Decision**: fake herdr/agmsg(既習 fakeHerdr 様式)+temp HOME+self-install ツリー合成で Must 面を決定的に検証。実 herdr/agmsg での完走はドッグフード環境で実施し record へ記録(FR-6b)
- **Consequences**: CI は決定的・高速。fake が固定する seam 期待が herdr 実変化の検出器を兼ねる(乖離時は fake 更新で追随 — R-2 緩和)
- **Alternatives Rejected**: (a) **実バイナリを CI へ** — herdr の GUI/tmux 前提が CI 環境で保証できず flaky 温床。(b) **手動実証のみ** — ユーザー却下済み

## 実装時判断へ委任する事項(pre-approved 分岐)

- C4 の prerequisite 検査関数の厳密な文言(exit 1+ツール名+公式入手先を含むこと、が契約。文言詳細は実装時)
- C1 allowlist の初期集合(実 corpus sweep の結果から確定 — FR-5c)
