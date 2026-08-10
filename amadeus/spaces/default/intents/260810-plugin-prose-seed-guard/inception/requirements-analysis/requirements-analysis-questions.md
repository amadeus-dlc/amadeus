# Requirements Analysis — 明確化質問（260810-plugin-prose-seed-guard）

上流入力(consumes 全数): business-overview.md、architecture.md、code-structure.md — 質問はいずれも RE 記録(`re-scans/260810-plugin-prose-seed-guard.md`)の patch-surface inventory と architecture.md の rename データ源二重化の実測から導出した。

> 運用注記: 本 intent は autonomy=full(grant `intent-grant-a6f5bfd3a9fac6778c076a070187d857`)。各質問は `amadeus-bolt decide-question` の5段梯子で裁定し、裁定結果と provenance を各 [Answer] に記録する(stage-protocol.md :135)。既決事項(Issue 本文・#2812 reframe・クロスレビュー裁定)は質問にしない。

## Q1: #2810 のトークン化範囲

11 行(Issue 宣言範囲)に加え、クロスレビューが同一修正での取込みを推奨した in-scope-adjacent 2 件(`formal-model-check.md:12` frontmatter `inputs:` 記述 / `README.md:101` 自己ポインタ — いずれも `.md` でトークン化可能、同じファイルを編集中)を含めるか。

A. 11 行のみ(Issue 宣言範囲に厳密)
B. 13 行(11 + adjacent 2 件) — レビュアー推奨。同一ファイル編集中の一貫性
C. 13 行 + `.ts` usage 文字列 3 件も本 intent で扱う(トークン機構では届かないため別手段が必要)
D. 実装時判断に委ねる
E. 上記以外の粒度
X. Other (please specify)

[Answer]: B — AUTO_DECIDED(`amadeus-bolt decide-question`、decision `auto-decision-566a3c25dacd45162fb08b1752df7132`、basis=agent-recommendation、solo-election は loud degradation 記録済み、grant `intent-grant-a6f5bfd3a9fac6778c076a070187d857`)。根拠: 両レビュアーの SR-2/SR-3 推奨+同一ファイル編集の一貫性。`.ts` 3 件は `{{HARNESS_DIR}}` 機構が構造的に届かないため out of scope(#2823 へ参照追記)。承認: 2026-08-10T09:56:00Z

## Q2: ドリフトガード述語の設置先

#2810 完了条件 3 のガード(plugins/ prose への root-relative ツール参照の再混入検出)をどこに置くか。RE 実測: t146 は `walkMd` により `.md`-only コーパス(`plugin.json`/`.ts` は構造的にコーパス外 → カーブアウト不要)、t531 は git grep で全 tracked file(`.json`/`.ts` が入り #2823 裁定までカーブアウトか恒久赤の二択)。

A. `tests/unit/t146-core-hygiene.test.ts` に新述語 — `.md`-only で #2823 との順序制約が発生しない(RE の決定的解)
B. `tests/integration/t531-…` に述語追加 — 全 tracked file を覆うが #2823 裁定待ちの順序制約
C. 両方に置く
D. 新規テストファイルを起こす
E. ガードは今回見送る
X. Other (please specify)

[Answer]: A — AUTO_DECIDED(decision `auto-decision-f6cae23e4d0ffceecdcb4e9475ba82c7`、basis=agent-recommendation、同 grant)。根拠: RE patch-surface inventory の実測 — t146 の `.md`-only コーパスなら #2823 未裁定でも両側実測(落ちる実証+corpus green)が成立する。P10 実測により CORE 根の唯一ヒット(sensor manifest :54 の意図的非 import 散文)は述語を PLUGINS 根に限定すれば非発生。承認: 2026-08-10T09:56:00Z

## Q3: #2812 等価性テストの配置層

`transform()` と `seedBytesForHarness()` のバイト一致テストをどの層に置くか。両関数とも純関数(実 FS 不要)。`tests/` → `scripts/` の import は 88 ファイルの先例あり。

A. `tests/unit/` — 純関数比較で実 FS を触らないため unit が適合(fs-tests-integration-first の適用外面)
B. `tests/integration/` — t2790 の隣に置く
C. `tests/smoke/` — transform の既存 importer(t-pi-dist-structure)と同層
D. 実装時判断
E. 上記以外
X. Other (please specify)

[Answer]: B — AUTO_DECIDED(是正裁定 decision `auto-decision-9785bf88b4af18bf75ae625845ea06cd`、basis=agent-recommendation、同 grant。初回裁定 A(decision `auto-decision-6c494d8d6532f87d3098d196450d1e3a`)は §12a iteration 1 の BLOCKER — code-structure.md:33 の記録『harness-dir-fixture.ts が readdirSync/require で manifest を実読するためヘルパー経由なら integration 層が既存流儀』および test-size ratchet(code-structure.md:90、tests/lib/test-size.ts:37-39 の medium 強制)との自己矛盾 — により失効)。根拠: manifest 実値の供給に harness-dir-fixture.ts を使う以上、実 FS 読取(readdirSync/require)がテストの import closure に入るため integration 層が正位置(cid:code-generation:fs-tests-integration-first に整合)。承認: 2026-08-10T10:35:00Z

## Q4: 修正後検証(閉包)の水準

#2810 完了条件 1 は「実 consumer ワークスペースでの実測確定」を要求する。reviewer-1 は repo 外の consumer 型レイアウトで A/B 対照(A: root-relative → exit 1 Module not found / B: harnessDir 相対 → CLI 到達)を実測済みだが、`INSTALL.md → compose → 実行` の end-to-end は未実行。本 intent の閉包水準は。

A. トークン化後の合成面(t2790 の compose E2E 拡張)で置換済みコマンド行の存在を assert + reviewer-1 の A/B 形を修正後に再演(B 形へ収束することを実測)
B. 実 consumer ワークスペースの end-to-end(INSTALL.md→compose→実行)まで本 intent で実施
C. 既存テスト green のみで閉包
D. 実装時判断
E. 上記以外
X. Other (please specify)

[Answer]: A — AUTO_DECIDED(decision `auto-decision-e33f87497a2a590fc56309d1f4a71dbd`、basis=agent-recommendation、同 grant)。根拠: cid:requirements-analysis:fix-review-replays-origin-repro(起票時再現の verbatim 再適用)を、Issue が「未実測」とした origin repro の実測済み代理(reviewer-1 の A/B 対照)の再演で満たす。B の完全 end-to-end は #2823(manifest 読取が consumer で不成立)が塞ぐため本 intent では構造的に完結不能 — #2823 側の完了条件として残す。承認: 2026-08-10T09:56:00Z
