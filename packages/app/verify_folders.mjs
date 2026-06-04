import fs from 'fs'; 

// Need to quickly fake postman.ts logic for standalone node execution since it's TS
const jsonStr = fs.readFileSync('/Users/managersahab/Downloads/Bitbucket.postman_collection.json', 'utf8');

const data = JSON.parse(jsonStr);
const rootName = data.info?.name || 'Imported Collection';
const collections = [{ id: 'root', name: rootName }];

const processItem = (item, currentFolderId, pathPrefix) => {
  if (item.item) {
    const newFolderId = Math.random().toString();
    const folderName = pathPrefix ? `${pathPrefix} / ${item.name}` : `${rootName} / ${item.name}`;
    collections.push({ id: newFolderId, name: folderName });

    item.item.forEach((subItem) => {
      processItem(subItem, newFolderId, folderName);
    });
  }
};

data.item.forEach((item) => processItem(item, 'root', ''));

console.log("=== FOLDER MAPPING SUCCESS ===");
collections.forEach(c => console.log(c.name));
