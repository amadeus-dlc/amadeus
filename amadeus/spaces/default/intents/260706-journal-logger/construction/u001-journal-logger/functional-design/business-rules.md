# Business Rules — u001-journal-logger

## 上流入力

[requirements.md](../../../inception/requirements-analysis/requirements.md)、[unit-of-work.md](../../../inception/units-generation/unit-of-work.md)、[unit-of-work-story-map.md](../../../inception/units-generation/unit-of-work-story-map.md)。

## 不変規則

1. 形式の正は契約 doc（FR-1）1 か所。validator・移行・prompt はそれを参照し、複製定義しない。
2. eval は RED を確認してから実装（fail 変異 3 種 = フィールド欠落 / 語彙外種別 / 命名違反）。fixture は実移行データのコピー（手書き合わせ禁止）。
3. validator の変更は skills/ 正準（AmadeusValidator.ts::checkSpaceLayers）→ promote の一方向。昇格先を直接編集しない。journal 検査は optional 扱い（未導入 workspace を fail させない = 配布互換）。
4. journal/ 直下の命名は README.md と <YYMMDD>.md の 2 種のみ（FR-2.1 の承認済み閉列挙を維持。手順書類は knowledge/ 配置 = questions Q3）。
5. 移行エントリの出自（#556 から移行）と発信者（leader）を全件に明記。生成後の書き換え禁止（NFR-2）。
6. 手順書の spawn 手順は spawn.sh の実測に基づく（机上で書かない）。ただし実行はしない（C-1）。
