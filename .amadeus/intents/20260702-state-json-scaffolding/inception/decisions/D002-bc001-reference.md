# D002: BC001 の参照

## 背景

Unit の `コンテキスト` は Domain Map の `adopted` Bounded Context を参照する必要がある。

## 判断

U001 のコンテキストとして、採用済みの BC001 自己開発運用を参照する。
新規 Boundary は採用せず、Domain Map と Context Map は更新しない。

## 理由

state.json の雛形生成は、自己開発 cycle の運用を支える BC001 の責務範囲であり、新しい境界を必要としないため。

## 影響

Finalization での Domain Map 反映は不要である。
