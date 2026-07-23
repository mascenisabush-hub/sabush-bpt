export interface CategoryGroup {
  groupName: string;
  categories: string[];
}

export const BUSINESS_CATEGORY_GROUPS: CategoryGroup[] = [
  {
    groupName: 'Retalho',
    categories: [
      'Mercearia',
      'Talho',
      'Padaria',
      'Peixaria',
      'Loja de Bebidas',
      'Farmácia',
      'Papelaria',
      'Loja de Roupa',
      'Loja de Calçado',
      'Cosméticos e Perfumaria',
      'Loja de Brinquedos',
      'Livraria',
    ],
  },
  {
    groupName: 'Alimentação',
    categories: [
      'Restaurante',
      'Café',
      'Bar',
      'Take-away',
      'Pastelaria',
    ],
  },
  {
    groupName: 'Construção e Ferragens',
    categories: [
      'Ferragens',
      'Material de Construção',
      'Loja de Tintas',
      'Loja de Canalização',
    ],
  },
  {
    groupName: 'Tecnologia',
    categories: [
      'Loja de Eletrónica',
      'Loja de Telemóveis',
      'Informática',
    ],
  },
  {
    groupName: 'Serviços / Outros',
    categories: [
      'Salão de Beleza',
      'Barbearia',
      'Oficina Auto',
      'Loja de Peças Auto',
      'Florista',
      'Loja de Móveis',
      'Loja de Material Escolar',
      'Outro',
    ],
  },
];

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
