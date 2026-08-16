# Decisions — 260816-open-bug-batch-7

depth = Minimal のため、本 intent が実際に行った選択のみを記録する。裁定は full autonomy の decide-question 梯子(E-AD-<hex8> = AUTO_DECIDED 裁定 ID 参照、questions ファイル参照)。

なお本ステージは self-fix の既定グリッドでは SKIP だが、複数 Issue 構成(1 Issue = 1 Unit = 1 PR)に必要な units-generation / delivery-planning の必須入力を生成するため、ユーザー承認済みの recompose(2026-08-16、RECOMPOSED 監査イベント)で application-design を含む 3 ステージを本 intent 限りで EXECUTE へフリップした(AD レビュー FOLLOW-UP 2 への応答として由来を明記)。

## D1: #2162 は修復でなく退役 — bootstrap fallback を除去し events 台帳へ一本化する

- **Context**(出典を主張ごとに帰属): (1) fallback(`validateBootstrapHistory`)は trustedSha に `events/` が無い場合のみ到達する分岐 — `bootstrap.ts:448-451` の実装事実(codekb `component-inventory.md` #2162 節が収載)。(2) `postRevision fc49f8de…` はどの ref からも到達不能な dangling commit で HEAD の祖先でない — 本 intent RE の実測(`codekb/amadeus/re-scans/260816-open-bug-batch-7.md` に記録)。(3) この乖離が PR #2127 の着地以後に存在することは Issue #2162 本文の主張(本 intent で再検証したのは現存性まで)。(4) 通常 CI(base-revision = 直近 merge-base)は events 分岐側を通るため fallback は実行されず、乖離の存在下でも main の必須 CI は green を維持してきた — fallback が実運用で不使用であることの構造的根拠。ULID events 台帳(#2338/#2353、2026-08-05 着地)が正本
- **Decision**: fallback 分岐・provenance 面(`bootstrap-provenance.json` + `bootstrap/` fixtures + 検証チェーン)・`baselineAtRevision` 死経路を除去し、events 不在は fail-closed の型付き診断とする(E-AD-BFDBEC73)
- **Consequences**: 欠陥 2 点(到達性検査不在・死経路)がクラスごと消滅。削除 −250〜−450 行 + テスト再構成 +120〜200 行。gate テストの fixture 構築は events-only 前提へ書換。以後 pre-events 断面への bootstrap 救済は不可(実運用で未使用のため受容)
- **Alternatives Rejected**: 修復案(provenance 再束縛 + postRevision 到達性検査追加)— evidence bundle の digest 束縛を再構成するコストが高く、実運用で使われない fallback の延命は「要求されない互換維持を追加しない」(org.md Forbidden)に反する
- **FR-NSD-1 の受け入れ確認の上書き**(AD レビュー FOLLOW-UP 1 への応答): 要件の AC「到達不能 postRevision の negative test が fail-closed」は、退役により postRevision の消費点自体が消滅するため文字どおりには充足不能となる。FR-NSD-1 が本文で方式裁定を application-design へ委譲していることに基づき、AC を「**events 欠落の trustedSha に対する読み出しが型付き診断 + 非 0 終了で fail-closed になる negative test(落ちる実証つき)**」へ本 ADR で上書きする。code-generation / build-and-test はこの上書き後の AC を正とする
- **Reversibility**: 中 — 復活には git 履歴からの復元 + provenance 再取得が必要だが、events 台帳は不変のため機能喪失はない

## D2: #2363 は kimi 先例踏襲の 3 面追加 + 2 方向検証

- **Context**: pi の配布欠落は 3 つの集合定義(components.md 参照)への不在が原因。kimi は #1522 でハーネス追加と同一 PR で promote-self に載った先例(要件 Q1 = E-AD-5E2DC8EC)
- **Decision**: 3 面へ pi を追加し、ignore 生成は pi dot-gitignore の `!/.pi/vendor/` と両立させる。検証は 2 方向 — (a) 追跡汚染 0 件 (b) vendor 配下の既追跡ファイルの非脱落(`git ls-files` 前後比較)。(b) は RA レビュー FOLLOW-UP 2 の指摘を設計へ取り込んだもの。あわせて FR-PI-1 の受け入れ確認の件数は固定値 15(起草時実測 `ls dist/pi/.pi/agents/ | wc -l` → 15)でなく**件数フリーの一致述語**(配送後 `.pi/agents/` のファイル集合 = 同時点の `dist/pi/.pi/agents/`)で読み替える — dist は生成物で件数が変動しうるため
- **Consequences**: 固定件数ピンのテスト 3 本が Red → 期待値更新で Green(TDD の Red 実測点)。集合 3 重定義は残る(単一正本化は out of scope、Issue #2363 論点として残置)
- **Alternatives Rejected**: 手動配置手順の文書化のみ — reviewer allowlist 未配布の構造欠陥が残るため(要件 Q1 の裁定で棄却済み)
- **Reversibility**: 高 — 3 行の削除で戻る

## D3: #3097 は 07 同期 + t3028 拡張(要件 Q3 の転記)

- **Context / Decision**: 要件 Q3(E-AD-90A2E836)で確定済み — 07 の表を matches 宣言 13 件へ同期し、t3028 の件数フリー検査対象へ 07 en/ja を追加。設計段の追加判断はサブセット導出の置き場所のみ: 期待集合は t3028 内の `derivedCorpus()` から matches 宣言でフィルタして導出し、07 専用の第 2 コーパス定義を作らない(canonical 1 定義からの導出 — construction ガードレール)
- **Consequences**: 07 の drift クラスが 06 と同じ guard に入る。落ちる実証(1 行注入 → Red → revert)を code-generation の完了条件へ引き継ぐ
- **Alternatives Rejected**: 07 の表を 06 参照へ置換 — 周辺 prose と一体の参照価値を失う(要件 Q3 で棄却済み)
- **Reversibility**: 高

## 規模と再利用の総括

3 Unit 合計の見積り: 変更 16 ファイル前後、+210〜330 行 / −270〜470 行(数値根拠は components.md の Unit 別見積り)。新規機構・新規 CI ジョブ・adapter 先行着地はゼロ(reuse inventory は components.md 参照)。

## D1 失効記録(2026-08-16、承認後)

D1(#2162 = 修復でなく退役)は、#2162 クロスレビュー(独立 2 名)の実測により **Context の中核前提が崩れたため失効**: fallback は現行コードで正常動作し(両名が repo 外 fresh clone で実走 exit 0、改竄 3 種は fail-closed exit 1)、「恒久 fail-closed の壊れた経路」という退役根拠は成立しない。ユーザー裁定(2026-08-16)で #2162 はクローズ、残余ギャップは #3155 へ切り出し、unit nsd-provenance は #3155 へ再束縛。#3155 スコープの方式(死経路除去 + 陳腐値/fallback/fixture の処遇)は実装前に再裁定する。D1 の「FR-NSD-1 AC 上書き」も同時に失効(新 AC は #3155 の期待結果を正とする)。

## クロスレビュー成立に伴う refinement 反映(2026-08-16/17、承認後)

#2363 / #3097 のクロスレビュー(各独立 2 名、全票 CONFIRMED_WITH_REFINEMENTS、収束 ESTABLISHED_WITH_REFINEMENTS)で確定した実装拘束を追記する:

- **D2 追補(#2363)**: 欠陥は self-install(promote-self)経路のみで、setup CLI 外部経路・model ピン(driver fallback で解決)は無傷 — D2 の既存設計と一致し変更なし。persona 数は 15(起票後 amadeus-builder-agent 追加)で件数フリー述語の妥当性を再確認
- **D3 追補(#3097、実装拘束の変更)**: (1) t3028 の既存述語は**名前集合のみ**を比較する(`tableRows()` が第1キャプチャのみ)ため、07 へ名前集合ガードを足すだけでは実測済みの値陳腐化 2 行を構造的に検出できない — **07 のガードは matches 値の一致まで検査する述語を要する**(FR-SEN-2 の「件数フリー契約」はこの値照合を含む形へ具体化) (2) reviewer-2 実測: **06 側(en:80 / ja:45)にも同一の陳腐値が残存** — 実装時に再実測のうえ同一変更で是正する(FR-SEN-1 のスコープに 06 の値陳腐化 2 行を追加) (3) git-drift が PostToolUse 経路で発火しない仮説(amadeus-sensor-fire.ts:225 の `if (!entry.matches) continue;`)は本 intent スコープ外の別トリアージ候補として申し送る

## D1'(再裁定): #3155 は退役方式 — ただし根拠は経済性と台帳衛生(2026-08-17)

- **Context**: fallback は健全(クロスレビュー実測)だが通常 CI で不使用。陳腐化 postRevision の単独是正は approved-evidence digest 束縛により不可能(値の編集は binding を壊す)で、唯一の in-place 修復 = evidence 全面再取得は高コスト
- **Decision**(E-AD-8D942DE5): fallback 面 + provenance 面 + fixtures を退役し、死経路(`baselineAtRevision` / `CANONICAL_PATHS.baseline`)を除去、pinned negative test を events-only 前提へ書換。events 不在の trustedSha は fail-closed の型付き診断。**根拠は「壊れているから」ではなく「不使用面の衛生修復コストが面の価値を上回る」**
- **Alternatives Rejected**: (B) 死経路のみ除去 + 陳腐値は履歴データとして文書化 — 台帳が fresh clone 不在オブジェクトを指し続ける衛生欠陥が恒久残存。(C) provenance 再取得 — 不使用面へ高コストの再構成を投資する経済的根拠がない
- **既存 fail-closed 挙動の保全**: 改竄 3 種の fail-closed(クロスレビューで実測済み)に相当する防御は events 経路側の既存検査が担う — 退役で防御水準を下げないことを build-and-test で確認する
