const stripHtmlTags = (htmlString) => {
  if (!htmlString || typeof htmlString !== 'string') return '';
  return htmlString
    .replace(/<\/?[^>]+(>|$)/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
};

export default stripHtmlTags;
