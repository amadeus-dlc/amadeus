# Code Generation Summary

## 実装

- plugin compose に `sensors` seam と plugin-owned sensor 配布を追加し、4つの self scope で `pr-convergence` を必須化した。
- per-Unit 成果物 guard を required-all に統一し、skip、recompose、workflow completion の bypass を拒否した。
- PR report を `created → converged/override` の CLI-only lifecycle にし、Intent/Unit/PR/3 head/content digest を束縛する `ARTIFACT_ATTESTED` receipt を追加した。
- self scope の create 前に branch、commit、tracked clean、remote、SHA 一致を検査し、report → attestation → blocking sensor の順序を自動化した。
- blocking sensor は Code Generation の `created` と最終 delivery の `converged/override` を区別し、欠落、改ざん、copy/replay、`landed` を fail closed にした。
- sensor fire/terminal event に同一 Fire id と output SHA-256 を束縛し、completion 時に current bytes と再照合して report 更新後の stale PASS を拒否する。
- create の対象変更確認を直近 commit から `base...HEAD` の branch 差分へ修正した。

## 検証と差分

- TDD の初回失敗は required-all、blocking 化、sensor seam、relative provenance の不足を再現し、実装後の targeted suite で解消した。
- 新規 `t534` unit/integration と既存 compose/package/CLI/sensor/lifecycle/provenance/event tests を使用した。専用 `t428` E2E は既存 packaging E2E と integration matrix が同じ生成・配布境界を被覆するため追加していない。
- `typecheck`、`lint`（既存基準と同じ 466 warnings / 17 infos、exit 0）、`build`、`distribution:check`、`source-only:check` は成功した。配布整合性は 444 payload、公開 projection は 448 files で一致した。
- 全体テストの初回並列実行で、今回の契約変更に追随していない complexity baseline、coverage registry、event count、sensor seam、required-all fixture の5ファイルを検出した。追随修正後、smoke/unit 427ファイル・6,645 assertion、integration 556ファイル・6,546 assertion、合計983ファイル・13,191 assertion がすべて成功した。
- digest、blocking gate、audit registry、git prerequisite の追加回帰は targeted suite でも成功した。missing output は digest 計算前の既存 dispatcher validation で非0終了し audit を書かない契約を `t92` で再確認した。
- validation 後に output が消える race も digest emitter が `missing` marker を記録して例外を漏らさないようにし、completion の current digest 照合では stale として拒否する。
- workspace 全体の `git diff --check` は成功した。
- 実装計画にあった独立 `pr-convergence-report.ts` / core attestation module は、plugin schema を core に漏らさないため `pr-convergence-attestation.ts` と既存 audit emitter の canonical event 拡張へ集約した。
- Step 6 の commit、push、GitHub 提出、実 linked report の生成を完了した。
- live blocking sensor で plugin script の projected path が basename 化される不具合を検出し、plugin subtree を保持する resolver と回帰試験を追加した。修正後の live fire は同一 digest の `SENSOR_PASSED` を記録した。
- [GitHub Pull Request #2905](https://github.com/amadeus-dlc/amadeus/pull/2905) を CLI から作成し、local/remote/PR head `076489e6d4abfd62020114dcd3e6bb69ac3c5c5f` に束縛した `created` report、canonical attestation、blocking sensor PASS を生成した。
- degrade-path の Unit 名を stage slug と衝突しない `issue-2838` に修正した。
