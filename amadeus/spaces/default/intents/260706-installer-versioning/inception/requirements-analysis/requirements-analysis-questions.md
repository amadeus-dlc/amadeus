# Requirements Analysis Questions — 260706-installer-versioning（Issue #543）

上流入力: [requirements.md](requirements.md)、feasibility のピア協議記録

## 確認済み事項

設計論点 6 問はピア協議（6 名全問 A 一致）で確定済み。本ステージの確定 5 件（manifest 名 / --version-info flag = --target 併用必須 / 時刻表記 / 自己参照除外 / sourceCommit 不能時）は小さな構造判断として自己判断し、根拠を requirements.md に記した。§12a 反復 1 の指摘を受けた追加確定（FR-2.6 = 廃止ファイルの改変退避、FR-3.3 = previous install 告知の採用、BR-13 独自 skill の既知の限界化、自己導入の走査除外確認）も含め、gate 承認で確定する。

| 論点 | 確定 | 種別 |
|---|---|---|
| manifest ファイル名 = .amadeus-install.json | 既存 .amadeus-* 命名族と一貫 | 自己判断（gate 確定） |
| 版確認 = --version-info flag | 既存 CLI の flag 形式を維持 | 自己判断（gate 確定） |
| 退避 dir 時刻 = `:` → `-` 置換 | ファイルシステム安全 | 自己判断（gate 確定） |
| manifest / 退避 dir は追跡対象外 | 自己参照回避 | 自己判断（gate 確定） |
| sourceCommit 取得不能時 = "unknown" + 告知 | 無言の失敗禁止（git 不在の tarball 配布等の縁ケース） | 自己判断（gate 確定） |

新規のピア協議・人間質問はない。
