export interface CategoryGroup {
  groupName: string;
  categories: string[];
}

export const BUSINESS_CATEGORY_GROUPS: CategoryGroup[] = [
  {
    groupName: 'Retalho Alimentar',
    categories: [
      'Mercearia',
      'Supermercado',
      'Minimercado',
      'Talho',
      'Padaria',
      'Pastelaria',
      'Peixaria',
      'Loja de Bebidas',
      'Hortifruti / Loja de Fruta e Legumes',
      'Loja de Congelados',
      'Distribuidor Grossista de Alimentos',
    ],
  },
  {
    groupName: 'Alimentação e Restauração',
    categories: [
      'Restaurante',
      'Café',
      'Bar',
      'Take-away / Comida Rápida',
      'Churrasqueira',
      'Pizzaria',
      'Confeitaria / Bolos',
      'Catering / Eventos Gastronómicos',
      'Quiosque de Bebidas',
    ],
  },
  {
    groupName: 'Saúde e Beleza',
    categories: [
      'Farmácia',
      'Clínica Médica',
      'Clínica Dentária',
      'Óptica',
      'Cosméticos e Perfumaria',
      'Salão de Beleza',
      'Barbearia',
      'Spa e Massagens',
      'Loja de Produtos Naturais',
    ],
  },
  {
    groupName: 'Moda e Vestuário',
    categories: [
      'Loja de Roupa',
      'Loja de Calçado',
      'Loja de Malas e Acessórios',
      'Boutique',
      'Alfaiataria / Costura',
      'Loja de Tecidos',
      'Joalharia e Relojoaria',
    ],
  },
  {
    groupName: 'Construção e Ferragens',
    categories: [
      'Ferragens',
      'Material de Construção',
      'Loja de Tintas',
      'Loja de Canalização',
      'Loja de Material Elétrico',
      'Loja de Cerâmica e Azulejos',
      'Carpintaria / Marcenaria',
      'Serralharia',
    ],
  },
  {
    groupName: 'Tecnologia e Eletrónica',
    categories: [
      'Loja de Eletrónica',
      'Loja de Telemóveis',
      'Informática',
      'Assistência Técnica de Eletrónicos',
      'Loja de Eletrodomésticos',
      'Loja de Videojogos',
    ],
  },
  {
    groupName: 'Automóvel e Transporte',
    categories: [
      'Oficina Auto',
      'Loja de Peças Auto',
      'Bomba de Combustível',
      'Lavagem Auto',
      'Loja de Pneus',
      'Aluguer de Viaturas',
      'Moto-táxi / Transporte',
    ],
  },
  {
    groupName: 'Agricultura e Pecuária',
    categories: [
      'Loja Agropecuária',
      'Venda de Sementes e Fertilizantes',
      'Avicultura',
      'Pecuária / Gado',
      'Piscicultura',
      'Loja de Ração Animal',
    ],
  },
  {
    groupName: 'Casa e Decoração',
    categories: [
      'Loja de Móveis',
      'Loja de Decoração',
      'Loja de Colchões',
      'Florista',
      'Loja de Utilidades Domésticas',
      'Loja de Iluminação',
    ],
  },
  {
    groupName: 'Papelaria e Educação',
    categories: [
      'Papelaria',
      'Livraria',
      'Loja de Material Escolar',
      'Centro de Explicações / ATL',
      'Escola / Academia de Formação',
      'Tipografia / Gráfica',
    ],
  },
  {
    groupName: 'Entretenimento e Lazer',
    categories: [
      'Loja de Brinquedos',
      'Ginásio / Academia de Fitness',
      'Salão de Jogos',
      'Organização de Eventos',
      'Estúdio de Fotografia',
      'Cinema / Casa de Espetáculos',
    ],
  },
  {
    groupName: 'Serviços Profissionais',
    categories: [
      'Escritório de Contabilidade',
      'Consultoria Empresarial',
      'Agência Imobiliária',
      'Seguradora',
      'Agência de Viagens',
      'Serviços Jurídicos',
      'Serviços de Limpeza',
      'Serviços de Segurança',
    ],
  },
  {
    groupName: 'Outros',
    categories: [
      'Lavandaria',
      'Estação de Serviços Diversos',
      'Funerária',
      'Outro',
    ],
  },
];

// Flat list of all known categories, used for name-based detection.
const ALL_CATEGORIES: string[] = BUSINESS_CATEGORY_GROUPS.flatMap(g => g.categories).filter(c => c !== 'Outro');

/** Strip accents and lowercase, for forgiving keyword matching. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// Keyword -> category. Checked against the normalized business name.
// Longer/more specific keywords are listed first within each entry group
// so a name like "Padaria e Pastelaria Central" matches "padaria" reliably.
const CATEGORY_KEYWORDS: { category: string; keywords: string[] }[] = [
  { category: 'Padaria', keywords: ['padaria', 'panificacao', 'panificadora'] },
  { category: 'Pastelaria', keywords: ['pastelaria', 'confeitaria', 'bolos', 'doceria'] },
  { category: 'Talho', keywords: ['talho', 'acougue', 'carnes'] },
  { category: 'Peixaria', keywords: ['peixaria', 'peixe', 'marisco'] },
  { category: 'Supermercado', keywords: ['supermercado', 'hipermercado'] },
  { category: 'Minimercado', keywords: ['minimercado', 'mini-mercado', 'mini mercado'] },
  { category: 'Mercearia', keywords: ['mercearia', 'mercadinho', 'quitanda'] },
  { category: 'Loja de Bebidas', keywords: ['bebidas', 'garrafeira', 'licoreria'] },
  { category: 'Hortifruti / Loja de Fruta e Legumes', keywords: ['hortifruti', 'fruta', 'legumes', 'horticola'] },
  { category: 'Loja de Congelados', keywords: ['congelados', 'frigorifico'] },
  { category: 'Distribuidor Grossista de Alimentos', keywords: ['grossista', 'distribuidora', 'atacado', 'atacadista'] },

  { category: 'Restaurante', keywords: ['restaurante', 'restaurant'] },
  { category: 'Café', keywords: ['cafe', 'cafeteria', 'coffee'] },
  { category: 'Bar', keywords: ['bar ', ' bar', 'cervejaria', 'pub'] },
  { category: 'Take-away / Comida Rápida', keywords: ['take-away', 'takeaway', 'fast-food', 'fast food', 'comida rapida'] },
  { category: 'Churrasqueira', keywords: ['churrasqueira', 'churrasco', 'grelhados'] },
  { category: 'Pizzaria', keywords: ['pizzaria', 'pizza'] },
  { category: 'Catering / Eventos Gastronómicos', keywords: ['catering', 'buffet'] },
  { category: 'Quiosque de Bebidas', keywords: ['quiosque'] },

  { category: 'Farmácia', keywords: ['farmacia', 'drogaria'] },
  { category: 'Clínica Médica', keywords: ['clinica medica', 'clinica', 'consultorio medico', 'centro medico'] },
  { category: 'Clínica Dentária', keywords: ['dentaria', 'dentista', 'odontologia', 'odontologica'] },
  { category: 'Óptica', keywords: ['optica', 'oculos'] },
  { category: 'Cosméticos e Perfumaria', keywords: ['cosmetico', 'perfumaria', 'perfumes'] },
  { category: 'Salão de Beleza', keywords: ['salao de beleza', 'salao de cabeleireiro', 'cabeleireiro', 'estetica'] },
  { category: 'Barbearia', keywords: ['barbearia', 'barbeiro', 'barber'] },
  { category: 'Spa e Massagens', keywords: ['spa', 'massagem', 'massagens'] },

  { category: 'Loja de Roupa', keywords: ['roupa', 'moda', 'vestuario', 'confeccoes', 'boutique de roupa'] },
  { category: 'Boutique', keywords: ['boutique'] },
  { category: 'Loja de Calçado', keywords: ['calcado', 'sapataria', 'sapatos', 'tenis'] },
  { category: 'Loja de Malas e Acessórios', keywords: ['malas', 'acessorios', 'bolsas'] },
  { category: 'Alfaiataria / Costura', keywords: ['alfaiataria', 'costura', 'costureira', 'alfaiate'] },
  { category: 'Loja de Tecidos', keywords: ['tecidos', 'capulanas'] },
  { category: 'Joalharia e Relojoaria', keywords: ['joalharia', 'joalheria', 'relojoaria', 'ourivesaria'] },

  { category: 'Ferragens', keywords: ['ferragens', 'ferragem'] },
  { category: 'Material de Construção', keywords: ['material de construcao', 'materiais de construcao', 'construcao'] },
  { category: 'Loja de Tintas', keywords: ['tintas', 'pinturas'] },
  { category: 'Loja de Canalização', keywords: ['canalizacao', 'canalizador', 'hidraulica'] },
  { category: 'Loja de Material Elétrico', keywords: ['material eletrico', 'eletricidade', 'eletricista'] },
  { category: 'Loja de Cerâmica e Azulejos', keywords: ['ceramica', 'azulejos'] },
  { category: 'Carpintaria / Marcenaria', keywords: ['carpintaria', 'marcenaria', 'carpinteiro', 'marceneiro'] },
  { category: 'Serralharia', keywords: ['serralharia', 'serralheiro'] },

  { category: 'Loja de Eletrónica', keywords: ['eletronica', 'electronica'] },
  { category: 'Loja de Telemóveis', keywords: ['telemoveis', 'celulares', 'smartphones'] },
  { category: 'Informática', keywords: ['informatica', 'computadores', 'computador'] },
  { category: 'Assistência Técnica de Eletrónicos', keywords: ['assistencia tecnica', 'reparacao de eletronicos'] },
  { category: 'Loja de Eletrodomésticos', keywords: ['eletrodomesticos', 'electrodomesticos'] },
  { category: 'Loja de Videojogos', keywords: ['videojogos', 'games'] },

  { category: 'Oficina Auto', keywords: ['oficina', 'mecanica auto', 'auto mecanica'] },
  { category: 'Loja de Peças Auto', keywords: ['pecas auto', 'pecas para automoveis'] },
  { category: 'Bomba de Combustível', keywords: ['bomba de combustivel', 'posto de combustivel', 'gasolineira'] },
  { category: 'Lavagem Auto', keywords: ['lavagem auto', 'lavagem de carros', 'car wash'] },
  { category: 'Loja de Pneus', keywords: ['pneus', 'pneu'] },
  { category: 'Aluguer de Viaturas', keywords: ['aluguer de viaturas', 'rent a car', 'aluguer de carros'] },
  { category: 'Moto-táxi / Transporte', keywords: ['moto-taxi', 'mototaxi', 'transportes', 'transporte'] },

  { category: 'Loja Agropecuária', keywords: ['agropecuaria', 'agro-pecuaria'] },
  { category: 'Venda de Sementes e Fertilizantes', keywords: ['sementes', 'fertilizantes', 'adubos'] },
  { category: 'Avicultura', keywords: ['avicultura', 'aviario', 'galinhas', 'frangos'] },
  { category: 'Pecuária / Gado', keywords: ['pecuaria', 'gado', 'bovinos'] },
  { category: 'Piscicultura', keywords: ['piscicultura', 'aquicultura'] },
  { category: 'Loja de Ração Animal', keywords: ['racao', 'racoes'] },

  { category: 'Loja de Móveis', keywords: ['moveis', 'mobiliario'] },
  { category: 'Loja de Decoração', keywords: ['decoracao', 'decoracoes'] },
  { category: 'Loja de Colchões', keywords: ['colchoes', 'colchao'] },
  { category: 'Florista', keywords: ['florista', 'flores'] },
  { category: 'Loja de Utilidades Domésticas', keywords: ['utilidades domesticas', 'utilidades'] },
  { category: 'Loja de Iluminação', keywords: ['iluminacao', 'candeeiros'] },

  { category: 'Papelaria', keywords: ['papelaria'] },
  { category: 'Livraria', keywords: ['livraria', 'livros'] },
  { category: 'Loja de Material Escolar', keywords: ['material escolar'] },
  { category: 'Centro de Explicações / ATL', keywords: ['explicacoes', 'centro de explicacoes', 'atl'] },
  { category: 'Escola / Academia de Formação', keywords: ['escola', 'academia de formacao', 'centro de formacao', 'instituto'] },
  { category: 'Tipografia / Gráfica', keywords: ['tipografia', 'grafica', 'impressao'] },

  { category: 'Loja de Brinquedos', keywords: ['brinquedos', 'brinquedo'] },
  { category: 'Ginásio / Academia de Fitness', keywords: ['ginasio', 'academia de fitness', 'academia', 'fitness'] },
  { category: 'Salão de Jogos', keywords: ['salao de jogos', 'casa de jogos'] },
  { category: 'Organização de Eventos', keywords: ['eventos', 'organizacao de eventos', 'decoracao de eventos'] },
  { category: 'Estúdio de Fotografia', keywords: ['fotografia', 'estudio de fotografia', 'foto studio'] },
  { category: 'Cinema / Casa de Espetáculos', keywords: ['cinema', 'espetaculos'] },

  { category: 'Escritório de Contabilidade', keywords: ['contabilidade', 'contabilista'] },
  { category: 'Consultoria Empresarial', keywords: ['consultoria'] },
  { category: 'Agência Imobiliária', keywords: ['imobiliaria', 'imoveis'] },
  { category: 'Seguradora', keywords: ['seguros', 'seguradora'] },
  { category: 'Agência de Viagens', keywords: ['viagens', 'agencia de viagens', 'turismo'] },
  { category: 'Serviços Jurídicos', keywords: ['advocacia', 'juridico', 'advogado', 'advogados'] },
  { category: 'Serviços de Limpeza', keywords: ['limpeza', 'servicos de limpeza'] },
  { category: 'Serviços de Segurança', keywords: ['seguranca', 'vigilancia'] },

  { category: 'Lavandaria', keywords: ['lavandaria', 'lavanderia'] },
  { category: 'Funerária', keywords: ['funeraria', 'funeral'] },
];

/**
 * Attempts to infer a business category from its name using keyword
 * matching (accent/case-insensitive). Returns null when nothing matches,
 * so callers can fall back to manual selection instead of guessing wrong.
 */
export function detectCategoryFromName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length < 3) return null;

  const norm = ' ' + normalize(trimmed) + ' ';

  for (const entry of CATEGORY_KEYWORDS) {
    for (const kw of entry.keywords) {
      if (norm.includes(normalize(kw))) {
        return entry.category;
      }
    }
  }
  return null;
}

export { ALL_CATEGORIES };

export function getSuggestedUnitsForCategory(category: string): string[] {
  if (!category) {
    return ['un', 'cx', 'saco', 'kg', 'emb', 'fardo', 'gfa', 'par', 'vol', 'l'];
  }

  const catLower = category.toLowerCase();

  // Mercearia / Talho / Peixaria / Padaria
  if (
    catLower.includes('mercearia') ||
    catLower.includes('talho') ||
    catLower.includes('peixaria') ||
    catLower.includes('padaria') ||
    catLower.includes('supermercado')
  ) {
    return ['cx', 'saco', 'kg', 'un', 'fardo', 'emb', 'g'];
  }

  // Loja de Bebidas / Bar / Restaurante / Café / Take-away / Pastelaria
  if (
    catLower.includes('bebida') ||
    catLower.includes('bar') ||
    catLower.includes('restaurante') ||
    catLower.includes('café') ||
    catLower.includes('take-away') ||
    catLower.includes('pastelaria')
  ) {
    return ['cx', 'gfa', 'un', 'vol', 'l', 'ml', 'emb'];
  }

  // Farmácia / Cosméticos e Perfumaria
  if (
    catLower.includes('farmácia') ||
    catLower.includes('cosmético') ||
    catLower.includes('perfumaria') ||
    catLower.includes('saúde')
  ) {
    return ['cx', 'emb', 'un', 'caixa', 'frasco'];
  }

  // Ferragens / Material de Construção / Tintas / Canalização
  if (
    catLower.includes('ferragens') ||
    catLower.includes('construção') ||
    catLower.includes('tintas') ||
    catLower.includes('canalização')
  ) {
    return ['saco', 'kg', 'un', 'vol', 'fardo', 'm', 'l', 'cx'];
  }

  // Loja de Roupa / Calçado
  if (
    catLower.includes('roupa') ||
    catLower.includes('calçado') ||
    catLower.includes('vestuário')
  ) {
    return ['un', 'par', 'cx', 'emb'];
  }

  // Eletrónica / Telemóveis / Informática / Papelaria / Livraria / Brinquedos
  if (
    catLower.includes('eletrónica') ||
    catLower.includes('telemóvel') ||
    catLower.includes('informática') ||
    catLower.includes('papelaria') ||
    catLower.includes('livraria') ||
    catLower.includes('brinquedos') ||
    catLower.includes('escolar')
  ) {
    return ['un', 'cx', 'emb', 'pacote', 'kit'];
  }

  // Auto / Peças / Móveis / Beleza / Florista
  if (
    catLower.includes('auto') ||
    catLower.includes('móveis') ||
    catLower.includes('beleza') ||
    catLower.includes('barbearia') ||
    catLower.includes('florista')
  ) {
    return ['un', 'cx', 'emb', 'kit', 'vol', 'par'];
  }

  return ['un', 'cx', 'saco', 'kg', 'emb', 'fardo', 'gfa', 'par', 'vol', 'l'];
}
