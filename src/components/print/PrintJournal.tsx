'use client';

/**
 * Diário Físico — layout exclusivo para impressão (capa premium + registros
 * formatados como páginas de papel). Renderiza somente quando o usuário
 * ativa "Diário físico" e imprime (Ctrl+P).
 */

import { useAppStore } from '@/stores/useAppStore';
import { useEntries, useProfile, useBudget, useGoals, useDreams } from '@/hooks/useData';
import { formatBRL } from '@/lib/format';
import { MOOD_LABELS } from '@/types';

export function PrintJournal() {
  const printPhysical = useAppStore((s) => s.printPhysical);
  const selectedYear = useAppStore((s) => s.selectedYear);
  const profile = useProfile();
  const entries = useEntries(selectedYear);
  const budget = useBudget();
  const goals = useGoals();
  const dreams = useDreams();

  if (!printPhysical) return null;

  return (
    <div className="print-physical text-black" style={{ color: '#111', background: '#fff' }}>
      {/* ================= CAPA ================= */}
      <div
        className="print-page-break"
        style={{
          minHeight: '260mm',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0c0c0e',
          color: '#f5d061',
          borderRadius: '4mm',
          textAlign: 'center',
          padding: '20mm',
        }}
      >
        <div style={{ border: '1px solid #d4af37', padding: '14mm 18mm', borderRadius: '2mm' }}>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '42pt', margin: 0 }}>
            Diário da Riqueza
          </h1>
          <div style={{ width: '30mm', height: '1px', background: '#d4af37', margin: '8mm auto' }} />
          <p style={{ fontSize: '16pt', color: '#fafafa' }}>{profile?.journalName}</p>
          {profile && (
            <p style={{ fontSize: '11pt', color: '#b4b4be', marginTop: '6mm' }}>
              {profile.name} • Meta: {formatBRL(profile.yearGoal)} até{' '}
              {profile.targetDate.split('-').reverse().join('/')}
            </p>
          )}
          <p style={{ fontSize: '12pt', color: '#d4af37', marginTop: '14mm' }}>
            Diário {selectedYear}
          </p>
        </div>
      </div>

      {/* ================= SONHOS E METAS ================= */}
      <div className="print-page-break" style={{ padding: '10mm 4mm' }}>
        <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '20pt', borderBottom: '2px solid #d4af37', paddingBottom: '2mm' }}>
          Sonhos e Objetivos
        </h2>
        <h3 style={{ fontSize: '14pt', marginTop: '8mm' }}>Sonhos</h3>
        <ul style={{ fontSize: '11pt', lineHeight: 1.9 }}>
          {dreams.length === 0 && <li>—</li>}
          {dreams.map((d) => (
            <li key={d.id}>
              [{d.achieved ? 'x' : ' '}] {d.title}
            </li>
          ))}
        </ul>
        <h3 style={{ fontSize: '14pt', marginTop: '8mm' }}>Metas</h3>
        <ul style={{ fontSize: '11pt', lineHeight: 1.9 }}>
          {goals.length === 0 && <li>—</li>}
          {goals.map((g) => (
            <li key={g.id}>
              [{g.status === 'concluida' ? 'x' : ' '}] {g.title}{' '}
              {g.targetValue ? `(${g.currentValue}/${g.targetValue})` : ''}
            </li>
          ))}
        </ul>
      </div>

      {/* ================= ENTRADAS ================= */}
      <div className="print-page-break" style={{ padding: '10mm 4mm' }}>
        <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '20pt', borderBottom: '2px solid #d4af37', paddingBottom: '2mm' }}>
          Registros Diários
        </h2>
        {entries.length === 0 && <p style={{ marginTop: '6mm', fontSize: '11pt' }}>Nenhum registro.</p>}
        {entries.map((e) => (
          <div
            key={e.id}
            className="print-entry"
            style={{ marginTop: '6mm', border: '1px solid #ccc', borderRadius: '2mm', padding: '6mm', pageBreakInside: 'avoid' }}
          >
            <p style={{ fontSize: '13pt', fontWeight: 700 }}>
              {e.date.split('-').reverse().join('/')}
              {e.mood ? ` — Humor: ${MOOD_LABELS[e.mood]}` : ''}
            </p>
            {e.wakeTime && <p style={{ fontSize: '10pt' }}>Acordou: {e.wakeTime}</p>}
            {e.exerciseDone && <p style={{ fontSize: '10pt' }}>Exercício: {e.exercise ?? 'sim'}</p>}
            {e.meals && <p style={{ fontSize: '10pt' }}>Alimentação: {e.meals}</p>}
            {e.studyTopic && (
              <p style={{ fontSize: '10pt' }}>Estudo: {e.studyTopic} — {e.studySummary ?? ''}</p>
            )}
            {e.productiveActions && (
              <p style={{ fontSize: '10pt', whiteSpace: 'pre-line' }}>Ações: {e.productiveActions}</p>
            )}
            <p style={{ fontSize: '10pt' }}>
              Receita: {formatBRL(e.income)} • Despesa: {formatBRL(e.expense)}
            </p>
            {e.thoughts && <p style={{ fontSize: '10pt' }}>Reflexões: {e.thoughts}</p>}
            <p style={{ fontSize: '10.5pt', marginTop: '2mm', fontWeight: 700 }}>
              Em prática: {e.practice}
            </p>
          </div>
        ))}
      </div>

      {/* ================= ORÇAMENTO ================= */}
      <div className="print-page-break" style={{ padding: '10mm 4mm' }}>
        <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '20pt', borderBottom: '2px solid #d4af37', paddingBottom: '2mm' }}>
          Orçamento {selectedYear}
        </h2>
        <table style={{ width: '100%', fontSize: '10pt', borderCollapse: 'collapse', marginTop: '6mm' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #999' }}>
              <th style={{ textAlign: 'left', padding: '2mm' }}>Data</th>
              <th style={{ textAlign: 'left', padding: '2mm' }}>Tipo</th>
              <th style={{ textAlign: 'left', padding: '2mm' }}>Categoria</th>
              <th style={{ textAlign: 'left', padding: '2mm' }}>Descrição</th>
              <th style={{ textAlign: 'right', padding: '2mm' }}>Valor</th>
            </tr>
          </thead>
          <tbody>
            {budget
              .filter((b) => b.date.startsWith(String(selectedYear)))
              .map((b) => (
                <tr key={b.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '1.8mm' }}>{b.date.split('-').reverse().join('/')}</td>
                  <td style={{ padding: '1.8mm' }}>{b.type === 'receita' ? 'Receita' : 'Despesa'}</td>
                  <td style={{ padding: '1.8mm' }}>{b.category}</td>
                  <td style={{ padding: '1.8mm' }}>{b.description}</td>
                  <td style={{ padding: '1.8mm', textAlign: 'right' }}>{formatBRL(b.value)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
