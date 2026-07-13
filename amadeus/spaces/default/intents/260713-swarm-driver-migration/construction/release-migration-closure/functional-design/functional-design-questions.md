# Release & Migration Closure Functional Design Questions

## 判定

`unit-of-work.md`と`unit-of-work-story-map.md`はU-06をrelease-only Unitとし、`requirements.md`のFR-22〜FR-26、NFR-06、NFR-08〜NFR-09、NFR-11〜NFR-12が完了条件を確定している。`components.md`、`component-methods.md`、`services.md`もC-04/C-12、macOS live、Linux deterministic、Windows対象外を固定している。したがって追加の製品判断は不要であり、以下は承認済み境界を実装可能なcontractへ精緻化した回答である。

## 上流で確定済みの設計確認

### Q1. U-06は新しいdriver behaviorや公開runtimeを持つか

[Answer]: 持たない。U-06はU-01〜U-05の成果を検査するrelease closureであり、provider probe、parser、wave、selector、checkpoint、refereeを変更しない。C-12の既存`package.ts`、`promote-self.ts`、setup検査、docs scan、release evidence indexを束ねるread-only checkを追加する。provider固有failureは該当Unitへ戻し、release closure内で近似修正しない。

### Q2. Claudeの2 driverを含むproduction registry完全性をどう判定するか

[Answer]: U-03 reviewで確定したdriver-keyed `DriverAdapterSet`を最終contractとする。production composition rootを実際にbuildし、provider集合がClaude/Codex/Kiroの3件、driver集合が`claude-agent-teams`、`claude-ultracode`、`codex-ultra`、`kiro-subagent`の4件、cardinalityが2/1/1、各keyと`adapter.driver`が一致することを検証する。`RegistrationSlot.kind=unavailable`、`REGISTRATION_SLOT_UNIMPLEMENTED`、fake/no-op adapter、余分・欠落・重複、dynamic loadが1件でもあればclosureを拒否する。source text検索だけを成功根拠にしない。

### Q3. どの配布先をdrift 0の対象にするか

[Answer]: 正本は`packages/framework/core`と`packages/framework/harness/{claude,codex,kiro,kiro-ide}`である。`scripts/package.ts --check`がdiscoveryした4つの`dist/{claude,codex,kiro,kiro-ide}`をbyte parityで検査し、`scripts/promote-self.ts --check`がClaude/Codex dogfood self-install（`.claude`、`.codex`、`.agents`、`CLAUDE.md`、`AGENTS.md`）を検査する。Kiro/Kiro IDEに存在しないself-install targetは捏造しない。generated treeは正本として直接編集しない。

### Q4. 文書同期を単なるtoken存在確認で終わらせないためにはどうするか

[Answer]: source文書の固定manifestを用意し、公開5値、harness別許容値、`auto`選択、明示hard error、dispatch前だけのloud fallback、0.1.x legacy全表、`AMADEUS_SWARM_DRIVER`と`AMADEUS_USE_SWARM`の競合、macOS/Linux、Windows未保証をsection単位で検査する。既存する英日pairは両方を対象にする。generated harness skillはC-12 parityで検査し、`dist`をdocs正本として直接scan・修正しない。

### Q5. platform matrixとlive evidenceをどう分けるか

[Answer]: macOSとGitHub Actions Linuxの両方でtypecheck、lint、unit、integration、deterministic E2E、distribution、self-installをgreenにする。credentialed native liveはローカルmacOSだけで、4 driverすべてをproduction registry/C-01/C-11経由で実行する。Linuxのfake/profile testやlive testのskipはmacOS live proofの代替にならない。Windowsは未実行・未保証であり、pass/failedの列を作らない。

### Q6. provider Unitが保存するlive evidenceをどう集約するか

[Answer]: U-03〜U-05が出力するredaction済みsummaryだけを`NativeLiveEvidenceIndexV1`へ参照する。各referenceはdriver、harness journey、macOS、CLI/profile version、execution/attempt/evidence digest、Unit/child count、C-08 verdict、C-11 check/finalize verdictを持ち、raw stream、prompt、credential、session本文を持たない。Claude 2 mode、Codex 1 mode、Kiro CLI/Kiro IDEの2 Unit・5 Unit journeyがすべてgreenでなければclosureを閉じない。

### Q7. 0.2.0削除Issueを重複なく追跡するにはどうするか

[Answer]: 日本語title/bodyと一意marker `<!-- amadeus:remove-amadeus-use-swarm:0.2.0 -->`を固定する。Code Generationで`amadeus-dlc/amadeus`の既存Issueをmarker検索し、openが1件なら再利用、0件なら単一publisher invocationで1件だけ作成する。create後はmarkerを再検索し、open exactly 1件かつ返されたnumber一致を確認してから成功する。複数件、closedだけ、create後の競合検出時は自動作成・再open・削除を続けず失敗し、人間による重複解消を要求する。Issueは旧env read、compatibility branch、warning、legacy-only test、暫定文書、全生成物、Claude/Codex/Kiro/Kiro IDE検証のchecklistを持つ。今回のscopeで実際の削除は行わない。

### Q8. 一部の検証が失敗または未実行の場合、release reportをどう扱うか

[Answer]: reportを`blocked`として不足IDと再実行commandだけを出し、greenへ推定しない。過去commitのtest/live receipt、別tree digest、認証不足、skip、unknown profile、floor/legacy実行をnative proofへ再利用しない。すべてのreceiptを同一release treeへ束縛できた場合だけ`closed`とする。

## 曖昧性分析

- U-06の責務、4 driver、4 harness projection、platform、legacy削除時期は上流で確定している。
- U-03のIteration 2で単一adapter slotはdriver-keyed setへ訂正済みであり、U-06はその最終contractを検査する。
- Code Generation entryでprovider live surfaceを確定できずparkされたdriverがあれば、U-06もblockedになる。これは追加のユーザー判断ではなくfail-closedな完了条件である。
