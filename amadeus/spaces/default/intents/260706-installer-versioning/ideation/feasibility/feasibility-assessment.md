# Feasibility Assessment — 260706-installer-versioning（Issue #543）

上流入力: [intent-statement.md](../intent-capture/intent-statement.md)、[competitive-analysis.md](../market-research/competitive-analysis.md)、[build-vs-buy.md](../market-research/build-vs-buy.md)

## repo 実測

1. **ハッシュ慣行**: 現行の実装慣行は sha256 のみである（`dev-scripts/generate-parity-baseline.ts` の `createHash("sha256")`、parity-baseline.json の 199 engine files）。Issue が挙げた「provenance の md5 実績」は examples/ 配下のものだったが、examples/ は現 main に存在せず（退役済み）、md5 の現役実装は grep で 0 件。→ Q2 の実質候補は sha256 単独。
2. **バージョン源**: インストーラ（scripts/amadeus-install.ts）は version / commit の概念を持たない（grep 0 件）。配布元 commit は、インストーラが clone 済み repo から実行される前提のため `git rev-parse HEAD` で取得可能。semver は repo に存在しない（package.json に version フィールドなし）。
3. **AMADEUS.md 変換**: `transformAmadeusMd`（純関数）が removeSections / removeBlocks を適用した生成物を書き出す。導入先ファイルの照合は変換後の内容に対して行う必要がある → manifest は「変換後の値」でハッシュを記録する（Issue 設計論点 5 の実測回答）。
4. **BR-13（stale skill 削除）**: MANIFEST.skillsGlobPrefix（amadeus*）に一致する導入先 skill のうち配布物に無いものを削除する。カスタマイズ検出はコピー対象ファイル単位の話であり、BR-13 は「配布物に存在しないディレクトリ」の話で直交する。ただし「利用者が amadeus* 名で独自 skill を置いた場合」は BR-13 が削除し得る（現行仕様。今回の hash 管理では救えない → 適用範囲の論点で扱う）。
5. **書き込み点**: コピー系の書き込みは 3 箇所（copyFileSync / writeFileSync）に集約されており、ハッシュ照合の挿入点は少ない。manifest の読み書き（JSON 1 ファイル）は標準 API で足りる。

## 机上検証（冪等性 × 戦略）

| 戦略 | 更新 1 回目（改変あり） | 同一配布物で再実行 | 収束性 |
|---|---|---|---|
| 退避型（rpmsave / xxx_orig） | 既存を `<name>_orig` へ退避 → 新版で上書き → manifest 更新 | 現状 = 記録ハッシュ → 何もしない（冪等） | 実ツリーは配布物へ収束する |
| 併置型（rpmnew / .new） | 新版を `<name>.new` へ併置 → 既存維持 → manifest は新版値へ更新するか要設計 | 既存はなお不一致 → .new を同内容で再生成（冪等） | 実ツリーは収束しない（利用者の改変が生き続ける） |

- 退避型の注意: 2 回目以降の更新で再び改変が検出されると `_orig` が上書きされ、初回退避が失われる（世代管理は複雑化するため非採用が妥当。summary で退避を明示告知して補う）。
- 併置型の注意: エンジンファイルが改変されたまま動き続けるため、配布契約（エンジン・amadeus* skills は改変しない前提）と衝突する。
- **bootstrap（manifest 不在の初回更新）**: 既導入環境には記録ハッシュが無く 3-way が成立しない。新配布物との 2-way になり「旧版由来の差分」と「カスタマイズ」を区別できない → 初回だけの扱いを要確定（ピア協議 Q6）。

## 実現可能性の判定

技術的リスクは低い（標準 API のみ、書き込み点 3 箇所、eval 基盤あり）。判断リスク（戦略選定・適用範囲・bootstrap）はピア協議 + gate で確定する。順序制約（#573 merge 後に Construction）は工程に織り込み済み。
