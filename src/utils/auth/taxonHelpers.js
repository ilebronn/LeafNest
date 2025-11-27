// src/utils/taxonHelpers.js

export const getIconForTaxon = (iconicTaxon) => {
  if (!iconicTaxon) return 'eye-off-outline';
  
  const taxon = iconicTaxon.toLowerCase();
  if (taxon.includes('plant') || taxon === 'plantae') return 'leaf';
  if (taxon.includes('bird') || taxon === 'aves') return 'radio-outline';
  if (taxon.includes('mammal') || taxon === 'mammalia') return 'paw';
  if (taxon.includes('insect') || taxon === 'insecta') return 'bug';
  if (taxon.includes('fish') || taxon.includes('actinopterygii')) return 'fish';
  if (taxon.includes('reptil') || taxon === 'reptilia') return 'skull';
  if (taxon.includes('amphibia') || taxon.includes('frog')) return 'water';
  if (taxon.includes('fungi') || taxon.includes('mushroom')) return 'umbrella';
  if (taxon.includes('mollusc') || taxon.includes('shell')) return 'ellipse';
  if (taxon.includes('arachnid') || taxon.includes('spider')) return 'bug-outline';
  return 'leaf';
};

export const getGradientForTaxon = (iconicTaxon) => {
  if (!iconicTaxon) return ['#10B981', '#059669'];
  
  const taxon = iconicTaxon.toLowerCase();
  if (taxon.includes('plant') || taxon === 'plantae') return ['#10B981', '#059669'];
  if (taxon.includes('bird') || taxon === 'aves') return ['#3B82F6', '#2563EB'];
  if (taxon.includes('mammal') || taxon === 'mammalia') return ['#F59E0B', '#D97706'];
  if (taxon.includes('insect') || taxon === 'insecta') return ['#8B5CF6', '#7C3AED'];
  if (taxon.includes('fish') || taxon.includes('actinopterygii')) return ['#06B6D4', '#0891B2'];
  if (taxon.includes('reptil') || taxon === 'reptilia') return ['#EF4444', '#DC2626'];
  if (taxon.includes('amphibia') || taxon.includes('frog')) return ['#14B8A6', '#0D9488'];
  if (taxon.includes('fungi') || taxon.includes('mushroom')) return ['#F97316', '#EA580C'];
  return ['#10B981', '#059669'];
};