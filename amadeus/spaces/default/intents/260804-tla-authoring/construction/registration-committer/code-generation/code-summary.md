# Code Summary — U4 registration-committer(Bolt 5、バッチ 3)

上流入力(consumes 全数): U4 functional-design / nfr-design 成果物(READY 確定)、code-generation-plan.md、bolt-plan.md Bolt 5 節。

## 実装結果(実測)

- ブランチ: `bolt-registration-committer`(base = tla-authoring-wt ad7cbae9f)
- コミット(6件): 91afeb205(optional evidenceBundle 参照 = schema 正本拡張)→ 17c187dc1(前提ゲート + map 合成)→ 586bb84b2(atomic replace commit)→ be23a4c3b(拒否経路テスト)→ cf635a10b(出荷 validator copy の同 verdict ピン)→ e21d1cecd(**canonical-lift 是正: reader を evidenceBundle へ統一**)
- 新設: `plugins/formal-model-check/tools/tla-registration.ts`(checkPreconditions:165 / parseEntryDraft:194 / composeRegisteredMap:223 / createRegistrationPorts:258 / commit:303、348行)、テスト t448(unit 24)+ t449(integration 15)
- 変更: `amadeus-formal-verif-model-map.ts`(ModelMapEvidenceBundle / optional evidenceBundle / MODEL_KEY_SETS / parseEvidenceBundle)、`amadeus-sensor-model-completeness.ts:739`(impl-only refresh の evidenceBundle 引き継ぎ1行 — 無音ドロップを赤実測してから追加)、`tla-authoring.ts`(commit verb)、`tla-applicability.ts:389-394`(reader 統一)、t444/t445(fixture 追随 + handoff ピン)

## 独立レビュー(§12a 相当、iteration 1/1)

- **READY(GoA 1 — 全面的支持)**(amadeus-architecture-reviewer-agent、read-only)
- 確認観点: FD 逐語照合(6検査順序 / PreconditionFailure ユニオン / reviewer 独立性判定 / commit 手順 1-6 / MODEL_KEY_SETS = Q1 裁定)、互換シム混入なし、検証劇場なし、atomic replace + 競合検知の fail-closed(t449 の TOCTOU 決定的注入で intruderMap 無傷を実測)、e21d1cecd の意味論不変 + registration-then-resolve テストの handoff 実効、テスト形状(BR-U4-15〜18 個別充足)、surgical / slop なし
- FOLLOW-UP 1件: dist 再生成の確認 → conductor が `bun run build` exit 0・dist へ evidenceBundle 投影・追跡差分なしを実測して閉包

## 検証(実測 exit code)

- builder(HEAD e21d1cecd): typecheck 0 / lint 0 / 対象7ファイル(t444×3 + t445×2 + t448 + t449)= 141 pass 0 fail / full CI RESULT: PASS(844 files / 11,223 assertions / 0 fail)/ coverage:ci 0 / patch gate PASS(measured 230, covered 230, allowlisted 0, uncovered 0)/ build 0・追跡差分なし / source-only 0 / complexity 0
- conductor 裏取り: 対象7ファイル = **141 pass / 0 fail**(103+38、exit 0)、e21d1cecd diff 検分(指示4項目と一致)
- referee: `amadeus-swarm check registration-committer` converged=true / tampered=false、finalize batch 3 converged 1 / failed 0
- TDD Red→Green: 統一前 t444 2 fail → 統一後 green。統合デモの pre-fix 実証は fix コミット後の checkout 差し替え(cid:code-generation:falling-proof-no-stash 準拠)で 3 fail を実測し復元確認

## 逸脱・裁定

1. **申告1(一時登録面)→ ユーザー裁定「後続 Issue へ送る」(2026-08-05)**: 変異系実 TLC の解消先は Issue #2286(変異モデルの一時登録面 + hermetic TLC fixture jar)。U4 は承認済み FD(正規 map の atomic replace のみ)のまま着地
2. **申告3(evidence→evidenceBundle 不一致)→ canonical-lift 執行**: U2 reader の `entry.evidence` は exactObject 検証下でどの実 map にも存在し得ない死に参照と conductor 実測で確定 — schema 正本 `evidenceBundle` へ統一(cid:code-generation:cross-unit-type-canonical-lift、単独コミット e21d1cecd、意味論不変)
3. 申告2/4/5(軽微)は conductor 受理 — 逸脱なし

## 申し送り

- Issue #2286: 変異モデルの一時登録面 + hermetic TLC fixture jar。着地時に `tests/.coverage-patch-allowlist.json` の runOnce 実 TLC 区間 waiver を除去
- U5 authoring-stage-e2e(バッチ 4)が最終 Bolt — commit verb を含む authoring 工程 E2E
