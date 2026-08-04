# Pi Harness Foundation — NFR Design Questions

## 回答方針

この Unit の解決済みdirectiveは `consumes: []` であり、`security-requirements` と `tech-stack-decisions` も条件付きで非適用である。これらを再作成せず、承認済みscopeに含まれるPi harness manifest、project-local resource、project trust、生成物境界のsecurity designだけを行う。

## Questions and Answers

### Q1. Pi project trustをAmadeus側で自動承認するか

[Answer]: しない。Piがproject-local settings、package、extension、skillを読み込む前のnative trust gateを唯一の承認境界とする。setupやextensionは`--approve`の自動付与、trust storeの編集、承認済み祖先の捏造を行わない。

### Q2. Harness manifestと生成済み`dist/pi`のどちらを正本にするか

[Answer]: authored `packages/framework/harness/pi/` と共通coreを正本とし、manifestからcandidate catalogと`dist/pi`を決定生成する。observed `dist/pi`や対象projectのinstall manifestを期待値へ使わない。

### Q3. Pi Packageのextension/skillをsandbox化するか

[Answer]: しない。Pi Package extensionは同一user権限で任意コードを実行し、skillはモデルへ任意操作を指示できる。foundationはtrust前loadを防ぎ、source/provenance/digestを検証するが、host OS sandboxは提供しない。

### Q4. Resource pathをmanifestからそのままコピーしてよいか

[Answer]: だめ。repository-relative normalized pathへparseし、absolute、`..` escape、NUL、case-fold collision、symlink escape、duplicate destinationを拒否する。regular fileをsource root内で再確認してからprojectionする。

## 曖昧性分析

- material ambiguityはない。
- lifecycle、child driver、transaction、doctorの詳細securityは各所有 Unitへ残し、foundationへ重複実装しない。
- 本Unitではperformance/scalability/reliability/logical-components artifactを生成しない。
