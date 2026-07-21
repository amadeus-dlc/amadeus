# Functional Design Questions — workspace-inspection

> 上流入力(consumes 全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`。
>
> 一次同期根拠: upstream commits `8e723b1`（depth-1 nested root detection）と `242953e`（`.gitmodules` / submodule detection）、承認済み ledger の `nested-root-detection` / `submodule-detection`。
>
> E-OC1 判定: 当初の質問0問判定は、初回独立reviewで不完全観測時のfail-closed状態が未決と判明したため撤回。leader承認 `2026-07-20T13:42:37Z` は未執行・無効。Q1を選挙へ付議する。

## 既決事項

U06の設計判断は、承認済みの上流同期plan、Requirements Analysis、Application Design、Units Generationで閉じている。

- `inspectWorkspace`、`detectDepthOneProjects`、`inspectSubmodules`をread-onlyなC3 seamとして既存workspace detectorへ凝集する。
- rootでbrownfield signalが一つでも見つかった場合はdepth-1 fallbackを実行しない。rootが無信号の場合だけ、除外dir・hidden dir・symlinkを除き、直下候補を決定順で走査する。
- 単一候補だけを`nestedRoot`へ確定し、複数候補は`nestedCandidates`とadvisoryへ残して自動選択しない。
- parse可能な`.gitmodules`のsubmodule pathを第6のbrownfield signalとし、未初期化pathは観測・警告するだけで、`git submodule update`を実行しない。
- birth、detect JSON、doctor、`WORKSPACE_SCANNED` auditは同じ`WorkspaceScan` snapshotから投影し、signalなしの既定出力を変えない。
- 読取不能・malformed metadataはcrashやfilesystem修復へ進めず、決定的なadvisoryまたは空の観測結果へ縮退する。

これらは新しい選択ではなく、FR-3 items 11–12、C3、U06制約からの機械導出である。実装開始前のdiff-refreshで既存choke pointが変わっていても、contract変更ではなく現在のownerへの再マップとして扱う。

## Q1: 不完全観測をどの型とprojector境界でfail-closedにするか

`requirements.md` FR-3はpermission failureを決定的に扱い、誤ったGreenfield scaffoldを許さない。C3はread-only `WorkspaceScan`とadvisoryを定めるが、root列挙不能、signal metadata読取不能、`.gitmodules`が存在するのにparse可能entry 0件の場合を、二値`Greenfield | Brownfield`のどちらへ置くかは明示していない。

- A: scan結果を`classified` / `inconclusive`の判別unionにする。birth/state projectorは`inconclusive`をmutation前に拒否し、detect/doctorはadvisory付きで観測結果を表示する。無効状態を型で排除できるが、既存scanner返却型の変更が最も大きい。
- B: `WorkspaceScan.projectType`の二値は維持し、blocking advisoryの有無をbirth/state projectorが必ず検査してmutationを拒否する。変更は小さいが、consumerがguardを呼び忘れる余地が残る。
- C: 不完全観測を保守的にBrownfieldへ分類し、advisory付きでReverse Engineeringを維持する。workflowは継続できるが、実在signalのないworkspaceをBrownfieldと表示しうる。

[Answer]: A。E-USSU06FD1で3–0採用、GoA 1x2 / 2x1 / 3–8は0、承認 `2026-07-20T13:53:03Z`。scan結果を`classified | inconclusive`判別unionとしてC3の一回限りの`WorkspaceScan`境界に閉じ、birth/state projectorはexhaustive matchで`inconclusive`を全mutation前にrejectする。detect/doctor/audit projectorは同じsnapshotのadvisoryを投影し、classifiedな既定経路のhuman/JSON/state bytesをNFR-3どおり不変に保つ。e1 GoA2留保を全数採用。根拠: `amadeus/spaces/default/elections/E-USSU06FD1/record.md`、同期元commit `ad44877a4`。
