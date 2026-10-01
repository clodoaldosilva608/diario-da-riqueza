/**
 * Gera o kit de 20 imagens de divulgação do Diário da Riqueza (redes sociais).
 *
 * Uso:
 *   bun scripts/generate_social_images.mjs --from 1 --to 7   # gera um intervalo
 *   bun scripts/generate_social_images.mjs --only 14         # regenera uma imagem
 *   bun scripts/generate_social_images.mjs                   # gera todas
 *
 * Marca: fundo preto obsidiana #09090b + dourado #d4af37 (+ verde esmeralda
 * #10b981 como acento secundário). Tom: organização, clareza, disciplina —
 * sem promessas de enriquecimento.
 */
import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';

const OUT_DIR = '/home/z/my-project/download/divulgacao';

const BRAND =
  'luxurious dark obsidian black background, metallic gold accents, ' +
  'premium fintech brand aesthetic, elegant minimal composition, cinematic studio lighting, ' +
  'ultra high quality, detailed, professional social media artwork, no watermark';

const ITEMS = [
  {
    file: '01_hero.png', size: '1024x1024',
    prompt: 'Smartphone floating at a slight angle displaying an elegant dark finance dashboard with glowing gold charts and a gold progress ring, the screen shows only abstract shapes and symbols with no readable words on it, above the phone the app name "Diário da Riqueza" written with correct Portuguese accentuation in refined metallic gold serif typography, deep black background with subtle golden light rays and soft golden dust particles, premium fintech brand aesthetic, elegant minimal composition, cinematic studio lighting, ultra high quality, professional social media artwork, no watermark, no other text anywhere',
  },
  {
    file: '02_offline.png', size: '1024x1024',
    prompt: 'Smartphone held upright displaying a dark elegant finance app with gold accents still fully working, a large golden crossed-out wifi icon floating beside the screen, the single word "OFFLINE" in small elegant gold letters at the top, deep black background with soft golden glow, concept of working without internet, ' + BRAND,
  },
  {
    file: '03_privacidade.png', size: '1024x1024',
    prompt: 'Gleaming metallic golden padlock hovering over a smartphone, all data visualized as glowing gold particles staying inside the device screen, the single word "PRIVADO" in small elegant gold letters at the top, deep black obsidian background, premium privacy and security concept, ' + BRAND,
  },
  {
    file: '04_sem_cadastro.png', size: '1024x1024',
    prompt: 'Smartphone showing an elegant dark finance app opening directly to its dashboard, a golden checkmark glowing beside it and a faded blank form document with a subtle strike-through in the background, the words "SEM CADASTRO" in small elegant gold letters, deep black background with golden particles, instant access concept, ' + BRAND,
  },
  {
    file: '05_metas.png', size: '1024x1024',
    prompt: 'Elegant golden target with an arrow in the bullseye floating above a smartphone showing a gold progress bar, a small golden flag on a dark mountain summit silhouette in the far background, deep black obsidian background with golden dust particles, goals and focus concept, ' + BRAND,
  },
  {
    file: '06_orcamento.png', size: '1024x1024',
    prompt: 'Elegant dark leather wallet with a few plain smooth golden coins floating above an open premium ledger book whose dark pages show abstract glowing gold and subtle red line entries, plain coins without any symbols or letters, no bitcoin symbol, clean organized composition, deep black background with warm golden light, budgeting concept, ' + BRAND,
  },
  {
    file: '07_evolucao.png', size: '1024x1024',
    prompt: 'Rising golden line chart glowing like a light trail climbing to the upper right with subtle emerald green accent dots, floating translucent holographic bar chart nearby, deep black obsidian background, tracking your own progress over time concept, premium fintech aesthetic, ' + BRAND,
  },
  {
    file: '08_gamificacao.png', size: '1024x1024',
    prompt: 'Shiny golden trophy next to a warm golden flame and small golden stars floating upward, a blurred elegant dark app screen in the background, no letters, no words, no symbols, no text anywhere, deep black background with golden celebration particles, turning discipline into habit concept, ' + BRAND,
  },
  {
    file: '09_estudos.png', size: '1024x1024',
    prompt: 'Open elegant notebook with a golden fountain pen and a graduation cap hovering above emitting golden sparkles, subtle floating book spines glowing softly, deep black obsidian background, studious premium atmosphere, learning journey concept, ' + BRAND,
  },
  {
    file: '10_diario.png', size: '1024x1024',
    prompt: 'Elegant open journal with softly written pages and a gold-nibbed fountain pen resting on it, warm golden candle-like glow, calm reflective mood, deep black obsidian background with soft golden bokeh, daily personal reflection concept, ' + BRAND,
  },
  {
    file: '11_streak.png', size: '1024x1024',
    prompt: 'Completely plain elegant dark poster background, deep black obsidian with a very subtle dark vignette and only a few tiny faint gold dust specks scattered, smooth matte finish, luxurious minimal, absolutely empty, no waves, no curved lines, no streaks, no objects, no calendar, no numbers, no letters, no text, no grid, ' + BRAND,
  },
  {
    file: '12_instalar.png', size: '1024x1024',
    prompt: 'Smartphone home screen gaining a new elegant golden app icon, a golden circular download arrow swooping into the phone, the app name "Diário da Riqueza" in small refined gold serif letters below the icon, deep black background with golden glow, quick install concept, ' + BRAND,
  },
  {
    file: '13_cofrinho.png', size: '1024x1024',
    prompt: 'Elegant golden piggy bank with a single plain smooth gold coin mid-air above the slot, plain coins without any symbols or letters, no bitcoin symbol, no banknotes, subtle emerald green glow in the soft-focus background, deep black obsidian background with a warm golden spotlight, saving with purpose concept, ' + BRAND,
  },
  {
    file: '14_citacao.png', size: '1024x1024',
    prompt: 'Minimalist elegant poster background, deep black with very subtle dark leather texture, thin metallic gold frame border inset near the edges, one large decorative metallic gold opening quotation mark in the upper left area and one smaller closing quotation mark in the lower right area, large empty black space across the middle, luxurious editorial poster style, absolutely no words, no letters, no numbers, no typography',
  },
  {
    file: '15_mural_fundadores.png', size: '864x1152',
    prompt: 'Museum-style dark wall covered with small elegant golden name plaques arranged in refined rows, all plaques completely blank with no readable text, one larger ornate golden circular emblem glowing brighter at the center with only abstract engraved patterns and no letters, no chinese characters, warm gallery spotlight, community recognition wall concept, deep black obsidian background, ' + BRAND,
  },
  {
    file: '16_apoie.png', size: '864x1152',
    prompt: 'Two open hands gently cupping a floating golden heart made of light, a warm coffee cup and a few golden coins resting nearby, gratitude and voluntary support concept, deep black background with soft golden bokeh, ' + BRAND,
  },
  {
    file: '17_fundador_ouro.png', size: '864x1152',
    prompt: 'Luxurious golden membership badge with an embossed crown and laurel wreath and a silk ribbon below, floating over dark flowing silk fabric, clean rays of pure golden light behind it, no text, no digits, no binary code, no matrix effect, ultra premium exclusive founding member aesthetic, deep black background, ' + BRAND,
  },
  {
    file: '18_dia_a_dia.png', size: '864x1152',
    prompt: 'Candid lifestyle photograph of a young Brazilian person sitting by the window inside a city bus at dusk, smiling while typing on a smartphone showing an elegant dark finance app with gold accents, warm city lights bokeh outside the window, authentic everyday moment, cinematic photography, shallow depth of field, ' + BRAND,
  },
  {
    file: '19_story_cta.png', size: '736x1312',
    prompt: 'Vertical smartphone mockup floating at center displaying an elegant dark finance dashboard with glowing gold charts, the single word "GRÁTIS" in bold metallic gold letters above the phone, an elegant thin golden arrow pointing down below the phone, deep black background with dramatic golden light rays and floating particles, premium app install story layout, ' + BRAND,
  },
  {
    file: '20_story_30dias.png', size: '736x1312',
    prompt: 'Vertical motivational design with a strong golden flame burning at the top center and below it a vertical calendar with thirty days marked in glowing gold forming a chain, the words "30 DIAS" in bold metallic gold letters, deep black obsidian background with golden particles, consistency challenge story layout, ' + BRAND,
  },
];

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (name) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const only = get('only');
  if (only !== undefined) {
    return ITEMS.filter((_, i) => i + 1 === Number(only));
  }
  const from = Number(get('from') ?? 1);
  const to = Number(get('to') ?? ITEMS.length);
  return ITEMS.slice(from - 1, to);
}

async function generate(zai, item, index) {
  const outPath = path.join(OUT_DIR, item.file);
  if (fs.existsSync(outPath) && fs.statSync(outPath).size > 50_000) {
    console.log(`↷ [${index}] já existe, pulando: ${item.file}`);
    return { ok: true, skipped: true };
  }

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await zai.images.generations.create({
        prompt: item.prompt,
        size: item.size,
      });
      const base64 = response?.data?.[0]?.base64;
      if (!base64) throw new Error('resposta sem base64');
      const buffer = Buffer.from(base64, 'base64');
      if (buffer.length < 20_000) throw new Error(`imagem suspeita (${buffer.length} bytes)`);
      fs.writeFileSync(outPath, buffer);
      console.log(`✓ [${index}] ${item.file} (${(buffer.length / 1024).toFixed(0)} KB)`);
      return { ok: true };
    } catch (error) {
      console.error(`✗ [${index}] tentativa ${attempt}/3 falhou: ${error.message}`);
      if (attempt < 3) await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
  return { ok: false };
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const selected = parseArgs();
  console.log(`Gerando ${selected.length} imagem(ns) em ${OUT_DIR}\n`);

  const zai = await ZAI.create();
  const results = [];
  for (let i = 0; i < selected.length; i++) {
    const item = selected[i];
    const index = ITEMS.indexOf(item) + 1;
    results.push(await generate(zai, item, index));
  }

  const failed = results.filter((r) => !r.ok).length;
  console.log(`\nConcluído: ${results.length - failed} ok, ${failed} falha(s)`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('Erro fatal:', e);
  process.exit(1);
});
