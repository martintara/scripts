const path = require('path');

module.exports = {
  onload: (plugin) => {
    plugin.addCommand({
      id: 'duplicate-image-as-annotated-and-link',
      name: 'Duplicate image as "-annotated" and insert wikilink',
      editorCallback: async (editor, view) => {
        try {
          const sourcePath = view?.file?.path ?? '';
          const selection = editor.getSelection();
          const cur = editor.getCursor();
          const line = editor.getLine(cur.line);

          // Patterns to detect image links
          const wikilinkRe = /!?\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]*)?\]\]/g; // ![[file.png]] (with optional alias/subpath)
          const mdImgRe = /!\[[^\]]*?\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;            // ![alt](path.png "title")

          const getWikiAtCursor = (text, ch) => {
            let m;
            while ((m = wikilinkRe.exec(text))) {
              const start = m.index;
              const end = start + m[0].length;
              if (ch >= start && ch <= end) return m[1].trim();
            }
            return null;
          };

          const getMdImgAtCursor = (text, ch) => {
            let m;
            while ((m = mdImgRe.exec(text))) {
              const start = m.index;
              const end = start + m[0].length;
              if (ch >= start && ch <= end) return m[1].trim();
            }
            return null;
          };

          // 1) Derive the link target from selection or cursor
          const pickFromSelection = (sel) => {
            if (!sel) return null;
            let m = wikilinkRe.exec(sel);
            if (m) return m[1].trim();
            m = mdImgRe.exec(sel);
            if (m) return m[1].trim();
            return sel.trim();
          };

          let linkTarget = pickFromSelection(selection);
          if (!linkTarget) {
            linkTarget =
              getWikiAtCursor(line, cur.ch) ??
              getMdImgAtCursor(line, cur.ch);
          }

          if (!linkTarget) {
            new Notice('No image link in selection or under cursor.');
            return;
          }

          // 2) Resolve to a TFile
          // This works for wikilinks and most markdown paths
          const tfile = app.metadataCache.getFirstLinkpathDest(linkTarget, sourcePath);
          if (!tfile) {
            new Notice('Could not resolve link: ' + linkTarget);
            return;
          }

          // 3) Ensure it’s an image
          const isImage = (ext) => /^(png|jpe?g|gif|bmp|webp|tiff?)$/i.test(ext);
          if (!isImage(tfile.extension)) {
            new Notice('Resolved link is not an image.');
            return;
          }

          // 4) Read original binary
          const data = await app.vault.readBinary(tfile);

          // 5) Build annotated filename in same folder
          const base = tfile.basename;      // without extension
          const ext = tfile.extension;      // without dot
          const dir = tfile.parent?.path ?? '';
          const annotatedBase = `${base}-annotated`;

          // Avoid collisions: add (2), (3), ...
          let newName = `${annotatedBase}.${ext}`;
          let newPath = dir ? `${dir}/${newName}` : newName;
          let i = 2;
          while (await app.vault.adapter.exists(newPath)) {
            newName = `${annotatedBase} (${i}).${ext}`;
            newPath = dir ? `${dir}/${newName}` : newName;
            i++;
          }

          // 6) Write duplicated image
          const newTFile = await app.vault.createBinary(newPath, data);

          // 7) Insert an embedded wikilink on the next line (properly resolved)
          const link = app.fileManager.generateMarkdownLink(newTFile, sourcePath);
          const embed = link.startsWith('!') ? link : `!${link}`;

          const insertPos = { line: cur.line + 1, ch: 0 };
          editor.replaceRange(`\n${embed}\n`, insertPos);

          new Notice(`Created ${newTFile.basename}.${newTFile.extension} and inserted link.`);
        } catch (e) {
          console.error(e);
          new Notice('Error duplicating image. See console for details.');
        }
      },
    });
  },
};
