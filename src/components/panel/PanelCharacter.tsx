'use client';

/**
 * Personagem do Painel — reage à saúde financeira do mês.
 * Três humores (crítico / em construção / próspero) × dois personagens (ele/ela).
 * SVG flat desenhado à mão, coerente com a identidade premium (navy + dourado).
 */

import type { ScoreResult } from '@/lib/panel';

type Tone = ScoreResult['tone']; // 'critical' | 'building' | 'prosperous' | 'none'
/** Humor visual: 'none' (mês sem dados) usa a versão calma do 'building' */
const visualTone = (t: Tone): Exclude<Tone, 'none'> => (t === 'none' ? 'building' : t);
type Character = 'ele' | 'ela';

const SKIN = '#f0c49a';
const SKIN_SHADOW = '#e0ac7e';
const NAVY = '#1d2433';
const NAVY_LIGHT = '#273247';
const GOLD = '#d4af37';
const HAIR_ELE = '#20242e';
const HAIR_ELA = '#3d2a22';

function Backdrop({ tone }: { tone: Tone }) {
  const t = visualTone(tone);
  const from = t === 'prosperous' ? '#1c2b22' : t === 'building' ? '#2b2416' : '#2b1a1a';
  const to = t === 'prosperous' ? '#0f1a14' : t === 'building' ? '#191410' : '#191010';
  return (
    <>
      <defs>
        <radialGradient id={`pc-bg-${t}`} cx="50%" cy="38%" r="75%">
          <stop offset="0%" stopColor={from} />
          <stop offset="100%" stopColor={to} />
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="96" fill={`url(#pc-bg-${t})`} />
      <circle cx="100" cy="100" r="96" fill="none" stroke={GOLD} strokeOpacity="0.25" strokeWidth="1.5" />
    </>
  );
}

/** Cabeça, rosto e cabelo — muda com o humor */
function Face({ tone, character }: { tone: Tone; character: Character }) {
  const t = visualTone(tone);
  const ela = character === 'ela';
  return (
    <>
      {/* cabelo de trás (ela) */}
      {ela && (
        <path
          d="M62 92 Q56 40 100 40 Q144 40 138 92 L134 122 Q140 86 126 72 Q112 60 100 60 Q88 60 74 72 Q60 86 66 122 Z"
          fill={HAIR_ELA}
        />
      )}
      {/* pescoço */}
      <rect x="92" y="112" width="16" height="16" rx="6" fill={SKIN_SHADOW} />
      {/* cabeça */}
      <circle cx="100" cy="86" r="34" fill={SKIN} />
      {/* orelhas */}
      <circle cx="66" cy="88" r="5" fill={SKIN} />
      <circle cx="134" cy="88" r="5" fill={SKIN} />
      {/* cabelo de cima */}
      {ela ? (
        <path d="M66 84 Q64 48 100 48 Q136 48 134 84 Q130 62 118 58 Q106 54 96 56 Q78 60 66 84 Z" fill={HAIR_ELA} />
      ) : (
        <path d="M66 82 Q68 50 100 50 Q132 50 134 82 Q126 64 100 64 Q74 64 66 82 Z" fill={HAIR_ELE} />
      )}
      {/* olhos */}
      {t === 'prosperous' ? (
        <>
          <rect x="76" y="76" width="19" height="11" rx="5" fill="#111318" />
          <rect x="105" y="76" width="19" height="11" rx="5" fill="#111318" />
          <path d="M95 81 h10" stroke="#111318" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M76 80 l-9 -4" stroke="#111318" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M124 80 l9 -4" stroke="#111318" strokeWidth="2.5" strokeLinecap="round" />
        </>
      ) : t === 'building' ? (
        <>
          <circle cx="86" cy="82" r="3" fill="#1c1c22" />
          <circle cx="114" cy="82" r="3" fill="#1c1c22" />
        </>
      ) : (
        <>
          {/* sobrancelhas anguladas + olhos apertados */}
          <path d="M78 74 l14 5" stroke="#1c1c22" strokeWidth="3" strokeLinecap="round" />
          <path d="M122 74 l-14 5" stroke="#1c1c22" strokeWidth="3" strokeLinecap="round" />
          <circle cx="87" cy="84" r="2.6" fill="#1c1c22" />
          <circle cx="113" cy="84" r="2.6" fill="#1c1c22" />
          {/* gota de suor */}
          <path d="M140 72 q7 9 0 14 q-7 -5 0 -14" fill="#7cc7e8" />
        </>
      )}
      {/* boca */}
      {t === 'prosperous' ? (
        <path d="M89 101 q11 8 22 0" stroke="#1c1c22" strokeWidth="3" strokeLinecap="round" fill="none" />
      ) : t === 'building' ? (
        <path d="M92 102 q8 5 16 0" stroke="#1c1c22" strokeWidth="2.6" strokeLinecap="round" fill="none" />
      ) : (
        <path d="M90 105 q5 -5 10 0 q5 5 10 0" stroke="#1c1c22" strokeWidth="2.6" strokeLinecap="round" fill="none" />
      )}
    </>
  );
}

/** Corpo — terno (ele) ou blazer (ela), dourado no detalhe */
function Body({ character }: { character: Character }) {
  return (
    <>
      {character === 'ela' ? (
        <>
          <path d="M56 200 L56 170 Q56 150 78 143 L94 137 L106 137 L122 143 Q144 150 144 170 L144 200 Z" fill={NAVY} />
          <path d="M94 137 L100 148 L106 137 Z" fill={SKIN_SHADOW} />
          <path d="M88 141 L100 200 L112 141 L106 137 L94 137 Z" fill={NAVY_LIGHT} />
          <circle cx="100" cy="156" r="3.4" fill={GOLD} />
          <circle cx="100" cy="164" r="2.4" fill={GOLD} />
        </>
      ) : (
        <>
          <path d="M56 200 L56 170 Q56 150 78 143 L94 137 L106 137 L122 143 Q144 150 144 170 L144 200 Z" fill={NAVY} />
          <path d="M94 137 L100 150 L106 137 L102 135 L98 135 Z" fill="#f4f4f5" />
          <path d="M100 150 l-6 9 6 24 6 -24 z" fill={GOLD} />
          <path d="M88 141 L96 200 L82 200 L76 152 Z" fill={NAVY_LIGHT} />
          <path d="M112 141 L104 200 L118 200 L124 152 Z" fill={NAVY_LIGHT} />
        </>
      )}
    </>
  );
}

/** Acessórios por humor — papelada, moeda ou riqueza */
function Props({ tone }: { tone: Tone }) {
  const t = visualTone(tone);
  if (t === 'prosperous') {
    return (
      <>
        {/* jatinho no horizonte */}
        <path d="M26 48 l22 -6 12 3 -18 9 -3 7 -4 -6 -9 -2 6 -3 z" fill="#cfd6e4" opacity="0.9" />
        <path d="M30 58 l14 2 6 -3 -3 8 z" fill="#aab3c5" opacity="0.9" />
        {/* pilha de moedas */}
        <g>
          {[0, 1, 2].map((i) => (
            <ellipse key={i} cx="42" cy={190 - i * 9} rx="14" ry="5" fill={GOLD} stroke="#a8862a" strokeWidth="1" />
          ))}
          <text x="42" y="193" textAnchor="middle" fontSize="9" fontWeight="700" fill="#6b5410">$</text>
        </g>
        <g>
          {[0, 1, 2, 3].map((i) => (
            <ellipse key={i} cx="162" cy={192 - i * 9} rx="12" ry="4.5" fill={GOLD} stroke="#a8862a" strokeWidth="1" />
          ))}
        </g>
      </>
    );
  }
  if (t === 'building') {
    return (
      <>
        {/* moeda única + seta de progresso */}
        <ellipse cx="44" cy="188" rx="12" ry="4.5" fill={GOLD} stroke="#a8862a" strokeWidth="1" />
        <path d="M150 176 l14 0 m0 0 l-6 -6 m6 6 l-6 6" stroke="#10b981" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M148 190 q10 -14 22 -18" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="2 5" fill="none" />
      </>
    );
  }
  return (
    <>
      {/* papelada caindo */}
      <g opacity="0.85">
        <rect x="24" y="58" width="13" height="17" rx="1.5" fill="#e8e6df" transform="rotate(-18 30 66)" />
        <rect x="160" y="52" width="13" height="17" rx="1.5" fill="#e8e6df" transform="rotate(14 166 60)" />
        <rect x="34" y="96" width="11" height="14" rx="1.5" fill="#d9d6cc" transform="rotate(24 39 103)" />
        <rect x="154" y="100" width="11" height="14" rx="1.5" fill="#d9d6cc" transform="rotate(-22 159 107)" />
      </g>
      {/* moedas escassas */}
      <ellipse cx="46" cy="192" rx="9" ry="3.4" fill={GOLD} opacity="0.55" />
    </>
  );
}

export function PanelCharacter({
  tone,
  character,
  className,
}: {
  tone: Tone;
  character: Character;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 200 200"
      role="img"
      aria-label={`Personagem do mês: ${
        tone === 'prosperous' ? 'no alto da montanha' : tone === 'building' ? 'subindo a montanha' : tone === 'none' ? 'em dia neutro' : 'sob pressão'
      } (${character === 'ele' ? 'ele' : 'ela'})`}
      className={className}
    >
      <Backdrop tone={tone} />
      <Props tone={tone} />
      <Body character={character} />
      <Face tone={tone} character={character} />
    </svg>
  );
}
