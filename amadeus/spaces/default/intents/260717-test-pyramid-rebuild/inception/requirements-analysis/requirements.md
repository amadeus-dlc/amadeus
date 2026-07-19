# Requirements — test-pyramid-rebuild(Issue #684)

上流入力(consumes 全数): `../../ideation/intent-capture/intent-statement.md`、`../../ideation/scope-definition/scope-document.md`、codekb `business-overview.md`・`architecture.md`・`code-structure.md`、`../practices-discovery/team-practices.md`

設計3論点は E-TPR-RA(2026-07-17T10:51:14Z 開票、Q1〜Q3 全 A・全会一致 4/4 全票 GoA 1 — agmsg 一次記録)で確定。Q4 は E-OC1 承認 10:52Z の既決導出。以下 FR はその焼き込み。

## FR-1: サイズ分類台帳(計測導出、Q4=A)

- **AC-1a**: 全テスト(tests/ 全域再帰 = 442、既存 test_pyramid コレクタ scripts/metrics-snapshot.ts:34-40 walk / :99 と同型の無制限再帰列挙。measurement ref HEAD `3917a283a953165866170d235d3dc25ad2fd3643` 実測)を classifyTestSize(関数 tests/lib/test-size.ts:49、型 TestSize :23、SIGNAL_PATTERNS :35-40)で分類した台帳を成果物化。tier×size マトリクス(tier は開いた集合 — 既知4 named tier {unit|integration|e2e|smoke} + harness/lib 等の補助 tier)+全行(file/measured/declared/signals)。ハードコード禁止(検証劇場 Forbidden)
- **AC-1b**: 台帳の数値は classifyTestSize の実行出力からの転記のみ(numbers-from-command-output-only)。実測 ref(HEAD SHA)を明記(measurement-ref-in-artifacts)

## FR-2: サイズ比率ガイドライン目標(E-TPR-RA Q1=A)

- **AC-2a**: 中長期の**ガイドライン目標**(強制ゲートでなく指針)を文書化: small ≥ 50% / medium ≤ 45% / large ≤ 5%
- **AC-2b**: 現状(small 13.6% / medium 85.7% / large 0.68% — RE 実測、全 442 に対して算定)からのギャップを台帳化。移設で段階的に近づける
- **AC-2c**: 比率の**強制ゲート化は本 intent Out**(移設 intent で検討 — Q1=A 明記)。数値は named 目標定数として文書化(constants-from-code の文書版 — マジックナンバー散在禁止)

## FR-3: 層境界(tier×size)の規約化(E-TPR-RA Q2=A)

- **AC-3a**: tier が size の上限を規約化: **unit=small のみ / integration=medium まで / e2e=large まで許容**。classifyTestSize が size の唯一の真実源。tier×size 規約は **4 named tier(unit/integration/e2e/smoke)のみに課す**。**harness/lib 等の補助 tier は台帳に可視だが規約対象外**(反証可能根拠: 補助 tier は size ピラミッドの層序を持たず、4 named tier のみが規約の対象)
- **AC-3b**: tier-aware ドリフトゲート(tier に対し measured size が上限超過で赤)の**設計を記す**(実装は移設 intent — 既存 size ドリフトゲート declared<measured は非破壊で温存、C-4)
- **AC-3c**: smoke tier の扱い(現状 14 medium)は規約の対象外 or integration 相当かを設計で明記

## FR-4: 移設対象選定台帳(E-TPR-RA Q3=A)

- **AC-4a**: unit 非 small 163件(signal 内訳は**重複計上・単純合算不可**: FS 153/spawn 99/network 1/timer 1。1ファイルが FS と spawn を同時検出しうる — RE 実測 scan-notes:40)を **seam 化可能性で優先度付け**した選定台帳を成果物化: (i) FS fixture I/O の関数直接呼び出し(in-process seam)へ置換可能分=最優先(既存 seam-export ノルム適用先) (ii) spawn の本質的 medium(CLI/hook を子プロセス検証)=size でなく tier を正す→integration へ移設候補
- **AC-4b**: 移設の**実装は本 intent Out**(別 intent、本 intent は選定台帳=計画まで)

## FR-5: 実行時間予算(層別、設計対象 — scope-document In-Scope 2 回復)

> scope-document.md:8(In-Scope 2「…+実行時間予算の設計(実測前提・値は選挙)」)・scan-notes.md:61(「実行時間予算…は選挙 U-1/U-2/U-3」)の承認済み項目。初稿で無申告脱落していたため回復。**スコープ変更ではなく承認済みスコープの回復**(値は既に units-generation 選挙へ routing 済み — requirements 段の新規選挙は不要)。

- **AC-5a**: 各 tier(unit/integration/e2e/smoke)の**実行時間予算(目標)を設計対象**として宣言。目標値は **units-generation(U-2)で各 tier の実行時間を実測したうえで選挙で確定**(scope-document「実測前提・値は選挙」)。requirements 段では基準値を断定しない(constants-from-code)。※ RE record には現時点で tier 別 wall-clock 実測データは無く、計測は U-2 の前提作業とする
- **AC-5b**: 予算は**ガイドライン目標**(FR-2 比率目標と同格。強制ゲート化=本 intent Out)。tier-aware ドリフトゲート(FR-3)と整合する形で設計に委ねる

## FR-6: #683 層別カバレッジ整合

- **AC-6a**: #683(Codecov ゲート)との層別カバレッジ測定経路の共有を計画に含める(Issue 実装スコープ4)

## FR-7: スコープ外・グリーン維持(Q4=A)

- 実移設(テストの書き換え・移動)・run-tests.sh 実装変更・新分類器・比率のハードコードは本 intent Out
- 既存スイートのグリーン維持(team.md Testing Posture)

## 将来条件チェックリスト(requirements-analysis:c4)

- **規模増**: テストは今後も増える → 分類台帳の再生成は classifyTestSize スイープの再実行で機械追随(生成スクリプト化を units で検討)
- **クラッシュ耐性**: 台帳生成は決定的スイープ(部分失敗は該当ファイルのみ)
- **別 OS**: classifyTestSize は regex 純関数で OS 非依存
- **消費側棚卸し**: 台帳の消費者は test_pyramid コレクタ+移設 intent+#683 整合計画 — 形式は既存 tier_size キーと整合

## Open Questions(後続への引き継ぎ)

- OQ-1(→ units-generation): U1 台帳/U2 層設計・比率・**実行時間予算(FR-5)値の選挙**/U3 移設計画の Unit 境界(scope-document 候補)
- OQ-2(→ 移設 intent): tier-aware ドリフトゲートの実装・比率強制の是非

## Assumptions

- A-1: classifyTestSize の SIGNAL_PATTERNS が現行世代の正(RE で実測)
- A-2: tier=ディレクトリ層(tests/ 直下サブディレクトリ由来の**開いた集合**)の前提維持(既存 test_pyramid コレクタの全域再帰と整合 — 4 named tier に加え harness/lib 等の補助 tier を含む)

## トレーサビリティ

FR-1/7 ← Q4(既決導出)。FR-2 ← E-TPR-RA Q1。FR-3 ← Q2。FR-4 ← Q3。**FR-5(実行時間予算)← scope-document In-Scope 2 の回復**(値は units-generation U-2 選挙へ routing 済み — requirements 段の新規選挙不要)。FR-6 ← Issue 実装スコープ4。すべて RE 実測(442ファイル分類)を前提材料に選挙で確定。
