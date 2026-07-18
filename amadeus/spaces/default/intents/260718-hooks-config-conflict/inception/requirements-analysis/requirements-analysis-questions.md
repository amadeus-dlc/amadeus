# Requirements Analysis — 明確化質問（260718-hooks-config-conflict）

intent: `260718-hooks-config-conflict`（[Issue #770](https://github.com/amadeus-dlc/amadeus/issues/770)、bugfix / Minimal）
起草: 2026-07-18 / conductor `codex-1`（amadeus-product-agent ペルソナ）

上流入力（consumes全数）: `amadeus/spaces/default/codekb/amadeus/business-overview.md`、`amadeus/spaces/default/codekb/amadeus/architecture.md`、`amadeus/spaces/default/codekb/amadeus/code-structure.md`

<!-- 判定証跡（eoc1-evidence-in-questions-header）:
判定: Q1 = 選挙必要（tracked canonical activation と mutable per-clone runtime state の恒久的な所有境界は、既決事項・実測から一意に導出できない）。Q2 = 選挙必要（self-repositoryだけを修復するか、Codex配布契約まで同時に修復するかは、Issueのclean fixture要件が対象を特定しておらず一意に導出できない）。テスト戦略は選挙不要（Issueのrestart要件、org / project / team品質契約、現行CIの外部依存境界から「必須hermetic CI + opt-in live acceptance」に一意導出）。
leader 承認: 2026-07-18T00:50:25Z（agmsg、leader → codex-1）— テスト戦略の選挙不要判定を承認し、Q1 / Q2 の選挙配信を受理
選挙: E-770-RA としてleaderがblind配信（起草者推奨 A / A は開票後に公開）
裁定受領: E-770-RA 開票 2026-07-18T00:52:33Z（agmsg、leader → codex-1）— Q1=A（e3 GoA 1 / e4 GoA 2、開票時2/3）、Q2=A（e3 GoA 1 / e4 GoA 1、開票時2/3）。Q1の留保必須票1件はAnswerとrequirementsへ転記。e1後着票は到着次第記録する。
[Answer] は leader による判定承認と選挙裁定の受領後にのみ記入する（election-answer-after-ruling）。 -->

## E-OC1 判定（1問1行）

- Q1: **選挙必要** — `.codex/hooks.json` の恒久的な所有モデル。現行 agmsg を維持する untrack / ignore と、外部 agmsg との協調変更を伴う static dispatcher + ignored sidecar は、どちらも受入条件を満たし得る一方、コストと所有境界が異なる真に未決の設計判断である。
- Q2: **選挙必要** — 修復をself-repositoryに限定するか、Codex配布契約まで含めるか。現行コードでは双方が成立し、Issueの「clean fixture」は対象fixtureを限定していない。

## 既決・実測から導出し、質問化しない事項

- [PR #783](https://github.com/amadeus-dlc/amadeus/pull/783) が解決した `.codex/agmsg-delivery-mode` の ignore / preserve と、未解決の `.codex/hooks.json` を分離する。前者を再実装しない。
- Codex 再導入と 2026-07-18 の再発実測により、「Codex 退役を前提とした運用是正」は失効している。
- `packages/framework/harness/codex/emit.ts:29-53,291-298` は9個の Amadeus commandを整形済み `hooks.json.example` として生成し、`docs/guide/harnesses/codex-cli.md:28-37` は実体への `cp -n` をローカル活性化手順としている。したがって、正準テンプレートの維持と既存活性化ファイルの非破壊は必須である。
- `scripts/promote-self.ts:84-97,207-299` は活性化済み `.codex/hooks.json` を preserve する。恒久策は promote の parity check / apply の双方でこの非破壊契約を維持する。
- agmsg 1.1.7 は `scripts/drivers/types/codex/type.conf:18` の `hooks_file=.codex/hooks.json` を正の runtime path とし、`delivery.sh:86-150` が strip / add 後に置換、`codex-monitor.sh:194` が起動ごとに monitor 設定を再適用する。pretty-print のみでは絶対 path と agmsg entry が tracked diff に残るため不十分である。
- 共通完了条件は、fresh Git fixture で monitor 登録前後の tracked bytes と `git status` が不変、Amadeus の9 command保持、tracked fileへのマシン / clone 固有絶対 path混入なし、mode遷移でagmsg entry重複なし、Codex再起動後のmonitor delivery維持、`dist:check` / `promote:self:check` / trust seed検証成功である。
- 回帰検証は、通常CIで実Git temp fixture + deterministic writer stubを必須化し、実agmsg / Codex bridgeの再起動後配送をopt-in live acceptanceで補完する。実agmsgをCIの必須依存にする案は現行CI・packaging契約外、hermeticのみはrestart受入を未証明、手動のみはregression test必須規範に反するため、いずれも選挙候補にしない。

## Q1. `.codex/hooks.json` の恒久的な所有モデルをどちらにするか？

- A. **活性化済み hooks を untrack / ignore する（推奨）** — tracked canonical は `.codex/hooks.json.example` に一本化し、`.codex/hooks.json` は `.claude/settings.local.json` と同様のローカル runtime file とする。現行 agmsg 1.1.7 と bridge再起動経路を変更せず、既存tracked fileは安全にindexから外す。代償として、template更新は既存活性化ファイルへ自動上書きせず、明示的なmigration / doctor案内で扱う。
- B. **tracked static dispatcher + ignored sidecarへ分離する** — `.codex/hooks.json` はmachine-neutralなdispatcherとしてtrackedのまま維持し、agmsgのmode・絶対pathをignored sidecarへ移す。canonical drift guardを保てるが、Amadeusと外部agmsgの協調変更、旧agmsg fallback、Windows command、turn / monitor / both / off、restart / SessionEndの互換検証を #770 の完了条件に含める。
- X. Other (please specify) — 所有者、Codexによる発見経路、migration、agmsg互換境界を具体化する

[Answer]: A — 活性化済み `.codex/hooks.json` をuntrack / ignoreし、tracked canonicalを`.codex/hooks.json.example`へ一本化する（E-770-RA裁定、2026-07-18T00:52:33Z、agmsg一次記録）。留保転記（e4 GoA 2、1件中1件）: self-install / bootstrapでexample→activeを確実に活性化する自動copyまたは明文手順と、`.gitignore` + promote preserveを同時にテスト可能なACへ固定し、fresh cloneがAmadeus hookなしで無音動作しないことを実証する。

## Q2. 修復対象をどの配布境界まで含めるか？

前提実測: root `.gitignore` と、Codex配布物になる `packages/framework/harness/codex/dot-gitignore` は別管理である。後者はmanifestを通じて `dist/codex/.gitignore` へ配布されるが、現状どちらも `.codex/hooks.json` をignoreしない。`packages/setup` はdistを汎用的にcopyするため、配布契約を選んでもsetup専用分岐は原則不要である。

- A. **self-repository + Codex配布契約を同時に修復する（推奨）** — rootのindex / ignoreに加え、Codex `dot-gitignore`、生成dist、活性化・migration文書、fresh packaged consumer fixtureを更新する。agmsgを利用する下流consumerにも同じ所有境界を提供する。
- B. **self-repositoryだけを修復する** — rootのindex / ignore、self-promotion、self用活性化経路とfixtureだけを変更する。最小diffだが、配布済みCodex harnessのagmsg利用者には同じtracked dirtyリスクを既知のまま残す。
- C. **段階化する** — #770ではself-repositoryだけを修復し、Codex配布契約はblocker・migration条件を明記した別Issueへ切り出す。初回PRは小さくなるが、全体の恒久解が完成するまでIssue間の追跡が必要になる。
- X. Other (please specify) — self / dist / setup / docs / migration / fixtureの境界を具体化する

[Answer]: A — self-repositoryとCodex配布契約を同時に修復する（E-770-RA裁定、2026-07-18T00:52:33Z、agmsg一次記録）。Codex `dot-gitignore`、生成dist、self-install、活性化 / migration文書、fresh packaged consumer fixtureまでを同一変更で同期する。`packages/setup`本体は、汎用copyで充足できる限り変更しない。
