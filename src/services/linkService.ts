
/**
 * Services for managing links
 */

export interface Link {
  id: string;
  url: string;
  title: string;
  timestamp: string;
  username: string;
}

/**
 * Save links to local storage
 */
export const saveLinksToStorage = (links: Link[]): void => {
  try {
    localStorage.setItem('kickstream_saved_links', JSON.stringify(links));
  } catch (error) {
    console.error('Error saving links to storage:', error);
  }
};

/**
 * Get saved links from local storage
 */
export const getSavedLinks = (): Link[] => {
  try {
    const savedLinks = localStorage.getItem('kickstream_saved_links');
    return savedLinks ? JSON.parse(savedLinks) : [];
  } catch (error) {
    console.error('Error getting saved links from storage:', error);
    return [];
  }
};

/**
 * Add a link to saved links
 */
export const saveLink = (link: Link): Link[] => {
  const savedLinks = getSavedLinks();
  const updatedLinks = [...savedLinks, link];
  saveLinksToStorage(updatedLinks);
  return updatedLinks;
};

/**
 * Remove a link from saved links
 */
export const removeLink = (id: string): Link[] => {
  const savedLinks = getSavedLinks();
  const updatedLinks = savedLinks.filter(link => link.id !== id);
  saveLinksToStorage(updatedLinks);
  return updatedLinks;
};

/**
 * Copy a link to clipboard
 */
export const copyLinkToClipboard = async (url: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch (error) {
    console.error('Error copying link to clipboard:', error);
    return false;
  }
};
