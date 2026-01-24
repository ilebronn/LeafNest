// services/api/enhancedDataFetchers.js
import axios from 'axios';

/**
 * ✅ ENHANCED: Fetch comprehensive Wikipedia data with multiple fallbacks
 * Tries full article, then revisions, then summary
 */
export const fetchComprehensiveWikipediaData = async (speciesName) => {
  try {
    console.log(`📖 Fetching comprehensive Wikipedia data for: ${speciesName}`);
    
    // Method 1: Full article extract (most comprehensive)
    try {
      const fullArticleResponse = await axios.get(
        `https://en.wikipedia.org/w/api.php`,
        {
          params: {
            action: 'query',
            titles: speciesName,
            prop: 'extracts|revisions|pageimages',
            explaintext: true,
            exsectionformat: 'plain',
            exintro: false, // Get full article, not just intro
            rvprop: 'content',
            rvslots: 'main',
            piprop: 'original',
            format: 'json',
            origin: '*'
          },
          timeout: 15000,
          headers: {
            'User-Agent': 'LeafNestApp/1.0 (Educational Species Identification)'
          }
        }
      );
      
      const pages = fullArticleResponse.data?.query?.pages;
      const pageId = Object.keys(pages)[0];
      
      if (pageId !== '-1') {
        const page = pages[pageId];
        let fullExtract = page.extract || '';
        
        // Clean and process the extract
        if (fullExtract && fullExtract.length > 500) {
          fullExtract = cleanWikipediaText(fullExtract);
          
          if (fullExtract.length > 1000) {
            console.log(`✓ Got comprehensive Wikipedia article: ${fullExtract.length} characters`);
            return {
              fullDescription: fullExtract,
              source: 'wikipedia-full',
              sections: extractSections(fullExtract),
              imageUrl: page.original?.source
            };
          }
        }
      }
    } catch (error) {
      console.warn('Full article fetch failed, trying revision...', error.message);
    }

    // Method 2: Revision content (wikitext format, very detailed)
    try {
      const revisionResponse = await axios.get(
        `https://en.wikipedia.org/w/api.php`,
        {
          params: {
            action: 'query',
            titles: speciesName,
            prop: 'revisions',
            rvprop: 'content',
            rvslots: 'main',
            format: 'json',
            origin: '*',
            formatversion: 2
          },
          timeout: 12000
        }
      );
      
      const revisionContent = revisionResponse.data?.query?.pages?.[0]?.revisions?.[0]?.slots?.main?.content;
      
      if (revisionContent && revisionContent.length > 800) {
        const plainText = parseWikitext(revisionContent);
        
        if (plainText.length > 1000) {
          console.log(`✓ Got Wikipedia revision content: ${plainText.length} characters`);
          return {
            fullDescription: plainText,
            source: 'wikipedia-revision',
            sections: extractSections(plainText)
          };
        }
      }
    } catch (error) {
      console.warn('Revision fetch failed, trying summary...', error.message);
    }

    // Method 3: REST API summary (fallback, shorter but reliable)
    const summaryResponse = await axios.get(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(speciesName)}`,
      {
        timeout: 8000,
        headers: {
          'User-Agent': 'LeafNestApp/1.0'
        }
      }
    );

    let extract = summaryResponse.data?.extract || '';
    extract = cleanWikipediaText(extract);

    console.log(`✓ Got Wikipedia summary: ${extract.length} characters`);
    return {
      fullDescription: extract,
      source: 'wikipedia-summary',
      sections: extractSections(extract),
      imageUrl: summaryResponse.data?.thumbnail?.source
    };

  } catch (error) {
    console.warn('All Wikipedia methods failed:', error.message);
    return null;
  }
};

/**
 * ✅ ENHANCED: Fetch detailed Encyclopedia of Life data
 */
export const fetchEOLDetailedData = async (speciesName) => {
  try {
    console.log(`🌍 Fetching EOL data for: ${speciesName}`);
    
    // Search for the species
    const searchResponse = await axios.get(
      `https://eol.org/api/search/1.0.json`,
      {
        params: {
          q: speciesName,
          page: 1,
          exact: true
        },
        timeout: 10000
      }
    );
    
    if (!searchResponse.data?.results?.length) {
      return null;
    }

    const eolId = searchResponse.data.results[0].id;
    
    // Get detailed page information
    const detailResponse = await axios.get(
      `https://eol.org/api/pages/1.0/${eolId}.json`,
      {
        params: {
          images_per_page: 5,
          videos_per_page: 0,
          sounds_per_page: 0,
          maps_per_page: 0,
          texts_per_page: 10,
          subjects: 'all',
          licenses: 'all',
          details: true,
          common_names: true,
          synonyms: true
        },
        timeout: 10000
      }
    );
    
    const dataObjects = detailResponse.data?.dataObjects || [];
    
    // Extract text descriptions
    const textObjects = dataObjects.filter(obj => 
      obj.dataType === 'http://purl.org/dc/dcmitype/Text' && 
      obj.description
    );
    
    // Organize by subject
    const organizedData = {
      overview: [],
      habitat: [],
      distribution: [],
      behavior: [],
      ecology: [],
      conservation: [],
      description: [],
      reproduction: [],
      other: []
    };
    
    textObjects.forEach(obj => {
      const text = cleanWikipediaText(obj.description || '');
      const subject = obj.subject?.toLowerCase() || 'other';
      
      if (text.length > 50) {
        if (subject.includes('habitat') || subject.includes('range')) {
          organizedData.habitat.push(text);
        } else if (subject.includes('distrib')) {
          organizedData.distribution.push(text);
        } else if (subject.includes('behav') || subject.includes('diet') || subject.includes('feed')) {
          organizedData.behavior.push(text);
        } else if (subject.includes('ecolog') || subject.includes('ecosystem')) {
          organizedData.ecology.push(text);
        } else if (subject.includes('conserv') || subject.includes('threat')) {
          organizedData.conservation.push(text);
        } else if (subject.includes('description') || subject.includes('morpholog') || subject.includes('character')) {
          organizedData.description.push(text);
        } else if (subject.includes('reprodu') || subject.includes('breed')) {
          organizedData.reproduction.push(text);
        } else if (subject.includes('general') || subject.includes('overview')) {
          organizedData.overview.push(text);
        } else {
          organizedData.other.push(text);
        }
      }
    });
    
    console.log(`✓ EOL data organized into sections`);
    
    return {
      sections: organizedData,
      commonNames: detailResponse.data?.vernacularNames?.slice(0, 10) || [],
      synonyms: detailResponse.data?.synonyms?.slice(0, 5) || [],
      images: dataObjects
        .filter(obj => obj.dataType === 'http://purl.org/dc/dcmitype/StillImage')
        .slice(0, 5)
        .map(img => ({
          url: img.mediaURL,
          thumbnail: img.thumbnailURL,
          license: img.license
        }))
    };
  } catch (error) {
    console.warn('EOL fetch failed:', error.message);
    return null;
  }
};

/**
 * ✅ ENHANCED: Fetch comprehensive iNaturalist taxon data
 */
export const fetchComprehensiveTaxonData = async (taxonId) => {
  try {
    console.log(`🔬 Fetching comprehensive iNaturalist data for taxon: ${taxonId}`);
    
    const response = await axios.get(
      `https://api.inaturalist.org/v1/taxa/${taxonId}`,
      {
        params: {
          locale: 'en',
          preferred_place_id: 1 // Global
        },
        timeout: 10000,
        headers: {
          'User-Agent': 'LeafNestApp/1.0'
        }
      }
    );
    
    const taxon = response.data?.results?.[0];
    
    if (!taxon) {
      return null;
    }
    
    // Get Wikipedia excerpt if available
    let wikipediaData = null;
    if (taxon.wikipedia_url) {
      try {
        const wikiName = taxon.wikipedia_url.split('/wiki/')[1];
        if (wikiName) {
          wikipediaData = await fetchComprehensiveWikipediaData(decodeURIComponent(wikiName));
        }
      } catch (error) {
        console.warn('Failed to fetch Wikipedia from iNat link');
      }
    }
    
    console.log(`✓ iNaturalist taxon data retrieved`);
    
    return {
      ...taxon,
      enhancedWikipedia: wikipediaData,
      fullTaxonomy: {
        kingdom: taxon.ancestor_ids?.length > 0 ? taxon.ancestors?.find(a => a.rank === 'kingdom')?.name : null,
        phylum: taxon.ancestor_ids?.length > 1 ? taxon.ancestors?.find(a => a.rank === 'phylum')?.name : null,
        class: taxon.ancestor_ids?.length > 2 ? taxon.ancestors?.find(a => a.rank === 'class')?.name : null,
        order: taxon.ancestor_ids?.length > 3 ? taxon.ancestors?.find(a => a.rank === 'order')?.name : null,
        family: taxon.ancestor_ids?.length > 4 ? taxon.ancestors?.find(a => a.rank === 'family')?.name : null,
        genus: taxon.ancestor_ids?.length > 5 ? taxon.ancestors?.find(a => a.rank === 'genus')?.name : null,
        species: taxon.rank === 'species' ? taxon.name : null
      }
    };
  } catch (error) {
    console.warn('Comprehensive iNat fetch failed:', error.message);
    return null;
  }
};

/**
 * ✅ Helper: Clean Wikipedia text
 */
const cleanWikipediaText = (text) => {
  if (!text) return '';
  
  let cleaned = text
    // Remove HTML tags
    .replace(/<\/?[^>]+(>|$)/g, '')
    // Remove citation brackets
    .replace(/\[\d+\]/g, '')
    .replace(/\[citation needed\]/gi, '')
    // Remove HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&[a-z]+;/gi, '')
    // Remove see also, references sections
    .replace(/==\s*(See also|References|External links|Further reading|Notes|Citations|Bibliography|Sources)[\s\S]*$/gi, '')
    // Remove section headers
    .replace(/==+\s*.*?\s*==+/g, '')
    // Clean up whitespace
    .replace(/\.{3,}/g, '.')
    .replace(/\s{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  
  // Ensure proper ending
  if (cleaned && !cleaned.match(/[.!?]$/)) {
    const lastPeriod = cleaned.lastIndexOf('.');
    if (lastPeriod > cleaned.length * 0.8) {
      cleaned = cleaned.substring(0, lastPeriod + 1);
    } else {
      cleaned += '.';
    }
  }
  
  return cleaned;
};

/**
 * ✅ Helper: Parse wikitext format
 */
const parseWikitext = (wikitext) => {
  if (!wikitext) return '';
  
  let parsed = wikitext
    // Remove templates
    .replace(/\{\{[^}]+\}\}/g, '')
    // Convert wiki links to plain text
    .replace(/\[\[([^|\]]+\|)?([^\]]+)\]\]/g, '$2')
    // Remove HTML tags
    .replace(/<[^>]+>/g, '')
    // Remove bold/italic markers
    .replace(/'{2,}/g, '')
    // Remove section markers
    .replace(/^[=]+.*[=]+$/gm, '')
    // Remove references
    .replace(/<ref[^>]*>.*?<\/ref>/gs, '')
    .replace(/<ref[^>]*\/>/g, '');
  
  return cleanWikipediaText(parsed);
};

/**
 * ✅ Helper: Extract sections from text
 */
const extractSections = (text) => {
  const keywords = {
    habitat: ['habitat', 'found in', 'lives in', 'native to', 'grows in', 'occurs in', 'inhabits'],
    distribution: ['distributed', 'range', 'endemic', 'widespread', 'geographical', 'region'],
    characteristics: ['characterized by', 'features', 'appearance', 'measures', 'size', 'color'],
    behavior: ['behavior', 'behaves', 'feeds on', 'diet', 'active', 'social', 'breeding'],
    conservation: ['conservation', 'threatened', 'endangered', 'vulnerable', 'protected'],
    reproduction: ['reproduction', 'breeding', 'mating', 'offspring', 'gestation'],
    ecology: ['ecology', 'ecosystem', 'role', 'interaction', 'predator', 'prey']
  };
  
  const sentences = text.split(/[.!?]+\s+/);
  const sections = {};
  
  Object.keys(keywords).forEach(section => {
    sections[section] = sentences
      .filter(sentence => {
        const lower = sentence.toLowerCase();
        return keywords[section].some(keyword => lower.includes(keyword));
      })
      .slice(0, 5)
      .join('. ');
    
    if (sections[section]) {
      sections[section] += '.';
    }
  });
  
  return sections;
};

export default {
  fetchComprehensiveWikipediaData,
  fetchEOLDetailedData,
  fetchComprehensiveTaxonData,
  cleanWikipediaText,
  extractSections
};