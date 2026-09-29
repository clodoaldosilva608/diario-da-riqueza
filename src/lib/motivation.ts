/**
 * Mensagens motivacionais no estilo Haroldo Ochoa — diretas, duras e inspiradoras.
 * A mensagem do dia é determinística (mesma data => mesma frase).
 */

export const MOTIVATION_MESSAGES: string[] = [
  'Vai pra cima com força. O mundo pertence a quem acorda cedo e executa.',
  'Cria possibilidades, não expectativas.',
  'Você não precisa de sorte. Precisa de disciplina todos os dias.',
  'A riqueza começa na mente antes de aparecer na conta.',
  'Quem registra, mede. Quem mede, melhora. Quem melhora, prospera.',
  'Ninguém vai te salvar. E é por isso que você vai vencer.',
  'Faça hoje o que os outros não fazem, para viver amanhã o que os outros não vivem.',
  'Dinheiro gosta de pressa com direção e medo de pressa sem plano.',
  'Não negocie com a sua preguiça. Ela sempre cobra caro.',
  'Estude como se fosse pobre, invista como se fosse rico.',
  'Seu padrão de vida atual é o resultado do seu padrão mental atual. Eleve o padrão.',
  'Sonhar é grátis. Realizar custa consistência. Pague o preço diário.',
  'A dor da disciplina dura minutos. A dor do arrependimento dura anos.',
  'Foque no processo e o resultado vem com juros compostos.',
  'Você é o CEO da sua vida. Tome as decisões de um bom CEO.',
  'Grandes fortunas são construídas em dias comuns, por pessoas comuns, com disciplina incomum.',
  'Nada de esperar a motivação. Ela mora no caminho, não no sofá.',
  'Um dia registrado é um tijolo no seu império.',
  'Feito é melhor que perfeito. Registrado é melhor que imaginado.',
  'Sua rede de contato vale mais que sua rede de wi-fi. Conecte-se com quem cresce.',
  'O segredo está em fazer pequenas coisas de forma consistente por muito tempo.',
  'Pare de esperar o momento perfeito. Ele não existe. O momento é AGORA.',
];

/** Mensagem determinística do dia (muda a cada data) */
export function messageOfTheDay(date = new Date()): string {
  const seed = date.getFullYear() * 372 + date.getMonth() * 31 + date.getDate();
  return MOTIVATION_MESSAGES[seed % MOTIVATION_MESSAGES.length];
}
