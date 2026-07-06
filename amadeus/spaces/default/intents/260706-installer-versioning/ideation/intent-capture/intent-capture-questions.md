# Intent Capture Questions — 260706-installer-versioning（Issue #543）

上流入力: [intent-statement.md](intent-statement.md)、Intake の decision 転記（承認 4 項目、順序制約）

## 確認済み事項（ディスパッチと Issue で解消）

| 論点 | 確定内容 | 出典 |
|---|---|---|
| 何を解くか | 無言上書きによるカスタマイズ喪失の防止 + 版の判別可能化 | Issue #543 背景 |
| 進め方 | market-research で dpkg / rpm / pacman 等の先行事例調査 → questions + 全メンバー同報ピア協議で設計論点を確定（#534 の 5/5 一致前例） | Issue「進め方の指定」、ディスパッチ |
| 維持する制約 | 非対話 1 コマンド（#451 確定 4）、冪等性（確定 5）、amadeus/ 不可侵、BR-13（stale skill 削除）との整合 | Issue 受け入れ条件・設計論点 |
| エスカレーション境界 | 配布契約の改定を含む契約級判断は人間へ個別エスカレーション | ディスパッチ |
| 順序制約 | Construction は #573 merge 後（scripts/amadeus-install.ts と installer eval の接触面） | ディスパッチ |

## 後続ステージへ引き継ぐ設計論点（本ステージでは確定しない）

Issue「決めること」の 6 論点をそのまま引き継ぐ。market-research（先行事例）と feasibility（実測）を経て、requirements の questions + ピア協議で確定する。

1. バージョンの表現（配布元 commit / semver / manifest = `.amadeus-install.json` 等の組み合わせ。Maintainer の承認要旨は manifest 案軸）。
2. ハッシュアルゴリズム（md5 = provenance 実績 vs sha256 = parity-baseline 実績。repo 内の既存慣行は両方あるため実測で整理する）。
3. 3-way 判定（前回配布時 / 新配布物 / 導入先現状。(a) 未改変 → 上書き、(b) 改変 → 戦略、(c) 削除 → 要確定）。
4. 改変検出時の戦略（dpkg conffile / rpm .rpmnew・.rpmsave / pacman .pacnew の型と、提案例 xxx_orig 退避の対応付け。非対話 1 コマンドとの両立）。
5. 既存機能との整合（BR-13、amadeus/ 不可侵、AMADEUS.md 変換生成物のハッシュの扱い）。
6. 適用範囲（全ファイル vs 利用者が触りそうな文書に限定）。
