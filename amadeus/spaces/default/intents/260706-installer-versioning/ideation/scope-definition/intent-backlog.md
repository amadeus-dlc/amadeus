# Intent Backlog — 260706-installer-versioning（Issue #543）

上流入力: [scope-document.md](scope-document.md)、[feasibility-questions.md](../feasibility/feasibility-questions.md)

## スコープバックログ（本 Intent に合流しない項目）

| 項目 | 行き先 | 判断 |
|---|---|---|
| overlay 適用済み agent（modelOverride: fable）の配布混入 | [Issue #579](https://github.com/amadeus-dlc/amadeus/issues/579)（leader 起案済み） | 合流しない。根拠: manifest は「配布時に書き込んだ内容の hash」を記録するため、後で逆変換配布が入っても 3-way の「配布物変化 + 導入先未改変 → 通常上書き」象限に落ち、カスタマイズ誤検出は発生しない。分離が安全で、合流は feature scope の肥大と #554 実装への依存追加が上回る（feasibility の decision で判断、本ステージで正式記録） |
| #533 guide Updating 節への 1〜2 行追随 | 実装確定時に engineer5 と担当調整 | 本 Intent の PR で拾うか後続かは code-generation 時に確定 |
| 退避物の自動清掃・保持期間 | 将来の運用 Issue 候補（必要が観測されたら） | Right-Sizing（暫定機構に堅牢化を作り込まない） |
