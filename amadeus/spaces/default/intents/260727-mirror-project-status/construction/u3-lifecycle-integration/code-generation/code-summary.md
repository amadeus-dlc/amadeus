# Code Summary — u3-lifecycle-integration

上流入力(consumes 全数): business-logic-model, business-rules, domain-entities, performance-design, security-design, unit-of-work, requirements

## 実装概要

U3 = U1/U2 の Project 同期機構を lifecycle 全 boundary へ配線し、completion close ゲートを導入(story-map ジャーニー3)。Bolt ブランチ `bolt/u3-lifecycle-integration`(bolt/u2 358c084b9 に stacked)、コミット列: 1cfcc7b77(実装+テスト)→ 47e6b273b(dist 再生成)。builder サブエージェント実装、conductor 検分済み。

## 変更ファイル(正本、測定 ref = bolt/u3 HEAD 47e6b273b)

- `packages/framework/core/tools/amadeus-mirror-policy.ts` — `CompletionProjectGateInput` :339 / `CompletionProjectGate` :345 / `projectBlocker` :350(blocking 行文言の純関数)/ `completionProjectGate` :365 — 台帳のみ入力・Project API 照会なし(BR-U3-8)、Done 名は `expectedProjectStatus` の done 分岐からのみ導出(独自文字列なし)
- `packages/framework/core/tools/amadeus-mirror-coordinator.ts` — `closeGateHold` :662(BR-U3-4/5: ready でなければ close へ進まず、receipt を書かず `pending`+`landing` 警告で blocking 内訳を可視化 — BR-U3-9 の層分離維持)/ `promptProjects` :694(BR-U3-6: 既存 binding 内の Project 面要約、board 照会 0 回)/ `askOutcome` :726 / `resolveBoundaryStep` :801(complexity gate 維持の関数分割)/ `driveBoundaryDecisions` :860
- `packages/framework/core/tools/amadeus-mirror-presentation.ts` — `MirrorPromptProjects` :296 / `projectLine` :311 / `renderMirrorPrompt` :327(Projects 行は対象 0 件で消える)

BR-U3-1(`Lifecycle Phase` を読む・boundary `phase` 引数不使用)/ BR-U3-2/3(parked keep、フェーズ同期で Done を書かない)は U1/U2 の `lifecycleSnapshot`(:252)+`expectedProjectStatus`(:243)で既に構造成立 — U3 は t346 の対照テストで固定。新 boundary・新トリガー・新 ask 種別の追加なし(BR-U3-7/6)。

## テスト

- `tests/integration/t346-amadeus-mirror-lifecycle-projects.integration.test.ts` — boundary 表5種×挙動 / close 阻止 negative と全 Done 後 close の対照ペア / parked 2経路 mutation 0 / ask golden(15 tests PASS)
- `tests/unit/t347-amadeus-mirror-completion-gate.test.ts` — gate 純関数 15 tests PASS(rename された done 名で判定・既定名では通らない対照ペア含む)
- 落ちる実証: `closeGateHold` の `if (gate.ready)` を `gate.ready || true` へ一時改変 → t346 gate 系2テスト赤(13 pass / 2 fail)→ 復元後 15 pass

## 検証(実測 exit code)

typecheck=0 / lint=0 / package.ts=0 / promote:self=0 / dist:check=0 / promote:self:check=0 / run-tests --ci=1(赤は t132 のみ = 既存赤 #1594、Test files 615 / Failed files 1 / assertions 8494 / failed 3)/ complexity-gate --check=0。Mirror 面6ファイル再実行 126 pass / 0 fail。

## 申告付き逸脱(1件 — reviewer 検証対象)

`completionProjectGate` の**戻り値**は component-methods.md:72 verbatim(`{ ready: boolean; blocking: readonly string[] }`)。**引数**は domain-entities の記述(`state` と lastAppliedStatus)に対し `{ state, snapshot, targets }` へ拡張。根拠: FD 自身が課す「Done 名の導出は `expectedProjectStatus` の done 分岐のみ」を満たすには `expectedProjectStatus(snapshot, "workflow-completed", statusNames)` の入力(workflow snapshot+configured target の status-names 上書き)が構造的に必要で、`state` 単独では done 名 rename(例: "Shipped")構成を正しく判定できない。BR-U3-8 の禁止(Project API 照会)には抵触せず、判定材料は台帳行のみ・決定的オフライン評価を維持。FD の2制約を両立する最小拡張として採用(t347 に rename 対照ペアで固定)。

## トレーサビリティ

FR-3c/3d, FR-4, FR-8, FR-10a — 受入条件 3,4,5,7,8,10(close 阻止面)、14(新トリガー機構禁止)。上記申告1件以外の逸脱なし。
