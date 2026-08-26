# korean-lunar-astro

[![CI](https://github.com/creepem/korean-lunar-astro/actions/workflows/ci.yml/badge.svg)](https://github.com/creepem/korean-lunar-astro/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/korean-lunar-astro)](https://www.npmjs.com/package/korean-lunar-astro)
[![npm downloads](https://img.shields.io/npm/dw/korean-lunar-astro)](https://www.npmjs.com/package/korean-lunar-astro)
[![bundle size](https://img.shields.io/bundlephobia/minzip/korean-lunar-astro)](https://bundlephobia.com/package/korean-lunar-astro)
[![license](https://img.shields.io/npm/l/korean-lunar-astro)](./LICENSE)

한국 음력 ↔ 양력 변환을 **룩업 테이블 없이 천문 계산으로** 수행하는 라이브러리입니다.
태양의 시황경(VSOP87)과 달의 위치(Meeus 제47장)로 24절기와 합삭 시각을 직접 구하고,
전통 치윤 규칙(무중치윤법)으로 윤달을 배치합니다.

Korean lunar calendar conversion computed from first principles — true solar
terms and true new moons via VSOP87 (Earth) and Meeus ch. 47 (Moon), with the
traditional no-junggi leap-month rule. No lookup tables, no supported-range
cliff. Zero dependencies, ~20 kB.

```bash
npm install korean-lunar-astro
```

```ts
import { solarToLunar, lunarToSolar, getLunarMonthLength, isValidLunarDate } from 'korean-lunar-astro';

solarToLunar(2025, 10, 6);
// { year: 2025, month: 8, day: 15, isLeapMonth: false }  ← 추석

lunarToSolar(2026, 1, 1);
// { year: 2026, month: 2, day: 17 }  ← 설날

lunarToSolar(2020, 4, 1, true); // 윤4월
// { year: 2020, month: 5, day: 23 }

getLunarMonthLength(2024, 1);   // 29 (작은달)
isValidLunarDate(2024, 1, 30);  // false
```

CommonJS도 지원합니다: `const { solarToLunar } = require('korean-lunar-astro');`

## 왜 이 라이브러리인가

| | 테이블 방식 (기존 패키지들) | korean-lunar-astro |
|---|---|---|
| 지원 범위 | 테이블 수록 구간(예: 1000–2050)에서 끝 | **1000–2500** (천문 계산이라 절벽 없음) |
| 2033년 윤달 문제 | 테이블이 틀리면 같이 틀림 | **윤11월로 정확히 계산** (아래 참고) |
| 24절기 | 없음 | 내부 계산 (동지 기준 치윤) |
| 다른 나라 음력 | 불가 | `meridianHours` 옵션으로 근사 가능 |
| 번들 크기 | 수십 kB 테이블 | ~20 kB, 의존성 0 |

### 2033년 문제

2033–2034년은 동지·삭 배치가 꼬여 윤달 위치가 계산법에 따라 갈리는 유명한
경계 사례입니다(한국천문연구원 공식: **윤11월**). 순환 주기 근사나 오래된
테이블을 쓰는 구현은 윤7월 등으로 틀리는 경우가 있습니다.

```ts
solarToLunar(2033, 12, 22);
// { year: 2033, month: 11, day: 1, isLeapMonth: true }  ← 윤11월 ✓
```

## 정확도와 검증

- **1900–2100년 전수(73,414일) 골든 테스트** — 커밋마다 CI에서 하루도 빠짐없이 검증
- **1980–2030년 양방향 왕복 변환 전수 검사**
- 설날·추석·부처님오신날 등 KASI 공표 날짜 대조
- 윤2월(2023)·윤4월(2020)·윤5월(2017)·윤9월(2014) 및 2033 윤11월 케이스
- 1582년 그레고리력 개력 경계(10월 4일 → 10월 15일) 연속성

계산 정밀도: 태양 황경 ≈1″, 달 황경 ≈10″. 합삭이 자정에 수 초 이내로
근접하는 극단적 경우 이론상 하루 차이가 날 수 있으나, 검증 구간(1900–2100)
에서는 발생하지 않았습니다.

> **면책**: 대한민국 공식 음력은 한국천문연구원(KASI)이 결정합니다. 법적·공식
> 용도로는 KASI 발표를 우선하세요. 특히 먼 미래의 날짜는 ΔT(지구 자전 감속)
> 예측 불확실성의 영향을 받습니다.

## 성능

| 시나리오 | 시간 |
|---|---|
| 처음 보는 연도 (콜드) | ~8 ms |
| 같은 연도 재변환 (캐시) | **~4 µs** |
| 201개 연도 콜드 스윕 | ~285 ms |

연 단위로 월 배치표를 캐시하므로, 달력 UI처럼 한 해를 반복 조회하는
경우 사실상 무료입니다.

## API

### `solarToLunar(year, month, day, options?) → KoreanLunarDate`

양력 → 음력. 1582-10-15 이전은 율리우스력으로 해석합니다.
존재하지 않는 날짜(2월 30일, 1582년 10월 5–14일 등)는 `RangeError`.

### `lunarToSolar(year, month, day, isLeapMonth?, options?) → SolarDate`

음력 → 양력. 존재하지 않는 음력 날짜 — 없는 윤달, 작은달(29일)의 30일 —
는 조용히 다음 달로 넘기지 않고 `RangeError`를 던집니다.

### `getLunarMonthLength(year, month, isLeapMonth?, options?) → 29 | 30`

### `isValidLunarDate(year, month, day, isLeapMonth?, options?) → boolean`

### `options.meridianHours`

합삭·절기가 어느 날짜에 속하는지 판정할 기준 자오선(동경, 시간 단위).
기본값은 한국 규칙(1911년 이후 UTC+9, 이전 UTC+8)입니다.

```ts
// 1997년 설: 한국 2/8, 중국 춘절 2/7 — 기준시 1시간 차이로 하루가 밀린 해
lunarToSolar(1997, 1, 1);                         // { year: 1997, month: 2, day: 8 }
lunarToSolar(1997, 1, 1, false, { meridianHours: 8 }); // { year: 1997, month: 2, day: 7 }
```

`8`은 중국 농력, `7`은 베트남 음력의 **근사**입니다(각국 공식 역법과는 ΔT
모델·공표 규칙 차이로 다를 수 있음). 1950–2050년 사이 한국(UTC+9)과
UTC+8 기준의 결과는 전체 날짜의 약 3.7%에서 하루 어긋납니다.

## 계산 방법

1. 기준 동지(천정동지)를 찾아 음력 연도를 고정
2. VSOP87 지구 위치로 12중기(태양 황경 30° 간격)의 진짜 입기 시각 계산 — 정기법
3. Meeus 제47장 달 위치로 진짜 합삭 시각 계산 — 정삭법
4. 합삭일~다음 합삭일 전날이 한 달; 중기를 포함한 달에 이름을 부여하고,
   동지가 든 달은 무조건 11월(동짓달)
5. 동지 사이 삭망월이 13개면 중기 없는 첫 달을 윤달로 — 무중치윤법

ΔT(지구시-세계시 차)는 구간별 다항식/표 근사를 사용합니다.

## 데이터 출처

- P. Bretagnon & G. Francou, *Planetary theories in rectangular and spherical
  variables — VSOP87 solutions*, Astronomy & Astrophysics 202 (1988)
- J. Meeus, *Astronomical Algorithms*, 2nd ed. (1998) — ch. 25, 32, 47;
  Table 47.A/47.B
- 치윤 규칙: 시헌력 전통 무중치윤법

## License

MIT
