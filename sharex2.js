const { exec } = require('child_process');
const path = require('path');

module.exports = {
  onload: (plugin) => {
    plugin.addCommand({
      id: 'open-in-sharex-from-wikilink',
      name: 'Open image in ShareX (from selection/cursor)',
      editorCallback: (editor, view) => {
        const sourcePath = view?.file?.path ?? '';
        let fileName = null;

        // 1) If user selected text, try to parse a wikilink from it
        const selection = editor.getSelection();
        const wikilinkRe = /!?\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]*)?\]\]/g;

        const parseFirstWiki = (text) => {
          const m = wikilinkRe.exec(text);
          return m ? m[1].trim() : null;
        };

        if (selection) fileName = parseFirstWiki(selection) || selection.trim();

        // 2) If nothing selected, find a wikilink under the cursor on the current line
        if (!fileName) {
          const cur = editor.getCursor();
          const line = editor.getLine(cur.line);
          let m;
          while ((m = wikilinkRe.exec(line))) {
            const start = m.index;
            const end = start + m[0].length;
            if (cur.ch >= start && cur.ch <= end) {
              fileName = m[1].trim();
              break;
            }
          }
        }

        if (!fileName) {
          new Notice('No wikilink under cursor/selection.');
          return;
        }

        // 3) Resolve the link to a real file in the vault
        const tfile = app.metadataCache.getFirstLinkpathDest(fileName, sourcePath);
        if (!tfile) {
          new Notice('Could not resolve link: ' + fileName);
          return;
        }

        const fsPath = path.join(app.vault.adapter.basePath, tfile.path);

        // 4) Make sure it’s an image
        if (!/\.(png|jpe?g|gif|bmp|webp|tiff?)$/i.test(fsPath)) {
          new Notice('Resolved link is not an image.');
          return;
        }

        // 5) Launch ShareX with the image
        const shareXPath = `"C:\\Program Files\\ShareX\\ShareX.exe"`;
        exec(`"C:\\ahk\\ShareX.ahk"`);

        exec(`${shareXPath} -ImageEditor "${fsPath}"`, (err) => {
          if (err) new Notice('Failed to open in ShareX. Check ShareX path.');
        });
      },
    });
  },
};
