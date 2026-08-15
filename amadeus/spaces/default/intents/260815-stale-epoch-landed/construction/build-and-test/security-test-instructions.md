# Security Test Instructions — intent 260815-stale-epoch-landed

## 判定: 適用可能な NFR が存在しない(検査は生成しない)

- 根拠: security NFR の宣言なし。ただし本変更の偽造耐性は integration 層で実測済み — digest・attestation id・audit 受領まで再導出した「アルゴリズムを知る偽造」に対し merge 束縛が fail-closed(t3110)
- ノルム: 同上。覆す条件: attestation へ外部由来値を載せる拡張が入った場合
