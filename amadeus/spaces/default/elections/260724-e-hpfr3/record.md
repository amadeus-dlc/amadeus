# Election Record — E-HPFR3

- question: 260724-harness-provenance / requirements-analysis: FR-3 の Cursor/OpenCode/Kiro 向け dot-dir 検出の位置づけを巡る scope 境界解釈。reviewer(2 iteration NOT-READY、iterations exhausted)が残した Major 指摘: FR-3 は dot-dir 検出を『一次手段』と位置づけているが、scope-document.md の Out of Scope #3(これら3ハーネスの恒久的自動検出手段の確立)と抵触する疑いがある。選択肢A: FR-3 を scope-document.md 通り manual-fallback-only へ縮小し、dot-dir 実装は見送る。選択肢B: dot-dir 検出は『確立』ではなく既存機構(harnessDir/deriveHarnessDir の KNOWN_HARNESS_DIRS プローブ)の単純再利用であり Out of Scope #3 に抵触しないと判断し、FR-3 を維持する。各自 requirements.md・scope-document.md Out of Scope #3・amadeus-lib.ts の harnessDir 実装を実測確認のうえ投票してください。

裁定: B: dot-dir検出は既存機構の再利用でOut of Scope#3に抵触しない、FR-3を維持する(choice 2: 3票)
内訳: choice1=2票 choice2=3票
- 留保(e6, GoA2): 既存機構の再利用という論点(B案)にも一定の理があり機械的に無効ではないが、reviewer 2 iteration連続Major指摘とscope文言を総合すると縮小側が妥当と判断。
- 留保(e3, GoA2): constraint-register.md TC-3・scope-document.md Out of Scope#3の文言はいずれも「env var検出手段の確立」に限定されており、bootstrap時点(2026-07-06)から既存のderiveHarnessDir()/harnessDir()(dot-dir probe)の再利用はこれに該当しないと判断する。ただしderiveHarnessDir()のCWDプローブ段(script-path解決が効かない場合のフォールバック)は複数harness dirが同居するdev repoでは誤検出しうるため、design段階でこの経路が実運用上使われないこと(script-path解決が常に先に成立すること)を確認するのが望ましい。
- 留保(e4, GoA2): constraint-register.md TC-3(feasibility)を実測確認したところ、Out of Scope #3の根拠は『Cursor/OpenCode/Kiroの自動検出用env varがリポジトリ内に実装例がない』という点に限定されており(TC-1〜TC-3はいずれもenv var検出手段の話)、対してFR-3のdot-dir検出はamadeus-lib.tsのderiveHarnessDir()/KNOWN_HARNESS_DIRSという既存の確立済み機構の再利用であり、TC-3が言う『未確立の自動検出手段の研究』とは別物と判断した。ただしFR-3の『一次手段』という表現は、scope-document.mdのScope Boundary Rationaleが述べる in-scope の上限(『フォールバック設計まで』)より踏み込んで見える書きぶりであり、AC-3c(unknown fallback)・FR-1 AC-1d(manual上書き)の存在を明記のうえ『非決定的な補助シグナル、常時manual上書き可能』という程度の慎重な表現へ調整することを推奨する。
- 留保(e1, GoA2): FR-3の requirements.md 見出し(『補助手段、Codex/Cursor/OpenCode/Kiro 向け一次手段』)がOut of Scope#3(恒久的自動検出手段の確立)との境界を曖昧にしている表現である点は要是正。ただし機構自体はamadeus-lib.ts:168-183のderiveHarnessDir()・:158のKNOWN_HARNESS_DIRSという既存実装の再利用であり、新規メカニズムの新設ではないためBを支持する。
- 留保(e2, GoA2): B案(既存機構の再利用)にも一定の理はあり機械的に無効ではないが、scope-document.mdの文言とreviewer 2iteration連続Major指摘を総合すると縮小側が妥当。
票タイムライン: 配信 2026-07-24T12:00:47Z → 配信 2026-07-24T12:00:47Z → 配信 2026-07-24T12:00:47Z → 配信 2026-07-24T12:00:47Z → 配信 2026-07-24T12:00:47Z → e6 2026-07-24T12:01:56Z(受理 2026-07-24T12:02:14Z) → e3 2026-07-24T12:02:32Z(受理 2026-07-24T12:02:42Z) → e4 2026-07-24T12:10:00Z(受理 2026-07-24T12:02:59Z) → e1 2026-07-24T12:04:13Z → e2 2026-07-24T12:11:01Z(受理 2026-07-24T12:11:32Z) → 開票 2026-07-24T12:12:27Z
GoA[E-HPFR3]: 1x0 2x5 3x0 4x0 5x0 6x0 7x0 8x0
