import type { KeyValueStore } from './KeyValueEditor';

export interface ParsedPostmanData {
  collections: { id: string; name: string }[];
  requests: {
    id: string;
    name: string;
    collectionId: string;
    method: string;
    url: string;
    headers: KeyValueStore[];
    params: KeyValueStore[];
    body: string;
  }[];
}

export function parsePostmanCollection(jsonStr: string): ParsedPostmanData {
  const data = JSON.parse(jsonStr);
  
  if (!data?.info?.name || !data?.item) {
    throw new Error('Invalid Postman Collection Format');
  }

  const rootCollectionId = crypto.randomUUID();
  const rootName = data.info.name || 'Imported Collection';
  const collections = [{ id: rootCollectionId, name: rootName }];
  const requests: ParsedPostmanData['requests'] = [];

  const processItem = (item: any, currentFolderId: string, pathPrefix: string) => {
    if (item.item) {
      // It's a folder, create a new mapping collection in API360
      const newFolderId = crypto.randomUUID();
      const folderName = pathPrefix ? `${pathPrefix} / ${item.name}` : `${rootName} / ${item.name}`;
      collections.push({ id: newFolderId, name: folderName });

      item.item.forEach((subItem: any) => {
        processItem(subItem, newFolderId, folderName);
      });
    } else if (item.request) {
      // It's a request
      const req = item.request;
      
      const headers: KeyValueStore[] = (req.header || []).map((h: any) => ({
        key: h.key || '',
        value: h.value || '',
        enabled: h.disabled !== true
      }));

      // Extract query params
      const urlObj = req.url || {};
      let urlStr = '';
      const params: KeyValueStore[] = [];

      if (typeof urlObj === 'string') {
        urlStr = urlObj;
        // Basic URL parse to extract params
        try {
            const u = new URL(urlStr);
            u.searchParams.forEach((val, key) => {
                params.push({ key, value: val, enabled: true });
            });
        } catch(e) {}
      } else {
        urlStr = urlObj.raw || '';
        (urlObj.query || []).map((q: any) => {
          params.push({
            key: q.key || '',
            value: q.value || '',
            enabled: q.disabled !== true
          });
        });
      }

      // Add one empty param row
      if (params.length === 0) params.push({ key: '', value: '', enabled: true });
      if (headers.length === 0) headers.push({ key: '', value: '', enabled: true });

      let body = '';
      if (req.body && req.body.mode === 'raw') {
        body = req.body.raw || '';
      }

      requests.push({
        id: crypto.randomUUID(),
        name: item.name || 'Untitled Request',
        collectionId: currentFolderId,
        method: (req.method || 'GET').toUpperCase(),
        url: urlStr,
        headers,
        params,
        body
      });
    }
  };

  data.item.forEach((item: any) => processItem(item, rootCollectionId, ''));

  return { collections, requests };
}
