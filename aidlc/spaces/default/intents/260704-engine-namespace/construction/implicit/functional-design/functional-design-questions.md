# Functional Design — 質問

Intent: 260704-engine-namespace / unit: implicit

requirements の未解決事項のうち、設計判断が必要なのは次の 1 問である。
（改名対応表は設計成果物として domain-entities.md に一覧化する）

## Q1. `.claude/` 側 symlink の名前を改名に合わせるか

`.claude/aidlc-common` は `.agents/aidlc/aidlc-common` への symlink である。
実体を `amadeus-common/` へ改名するとき、symlink の名前をどうするか。

A. symlink 名も `amadeus-common` へ改名し、repo 内の `.claude/aidlc-common/...` 参照をすべて `.claude/amadeus-common/...` へ更新する。トークン対応表（`aidlc-common` → `amadeus-common`）が path・content・symlink 名を一様に扱え、正規化規則が 1 本で済む
B. symlink 名は `aidlc-common` のまま残す（実体だけ改名）。参照更新は減るが、旧名が `.claude/` に残り N005（旧名残存ゼロ）と衝突する
X. Other (please specify)

[Answer]: A. symlink 名も `amadeus-common` へ改名し、repo 内の `.claude/aidlc-common/...` 参照をすべて `.claude/amadeus-common/...` へ更新する（Mode: Grill me、推奨回答どおり）
