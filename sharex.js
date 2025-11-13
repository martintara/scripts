const { exec } = require('child_process');
const path = require('path');

module.exports = {
  onload: (plugin) => {
    plugin.addCommand({
      id: 'open-in-sharex',
      name: 'Open image in ShareX',
      callback: () => {
        const activeFile = app.workspace.getActiveFile();
        if (!activeFile) {
          new Notice('No active file.');
          return;
        }

        const filePath = path.join(app.vault.adapter.basePath, activeFile.path);
        if (!filePath.match(/\.(png|jpg|jpeg|gif|bmp|webp)$/i)) {
          new Notice('Not an image file.');
          return;
        }

        // Adjust path to where ShareX is installed
        const shareXPath = `"C:\\Program Files\\ShareX\\ShareX.exe"`;

        exec(`${shareXPath} "${filePath}"`, (err) => {
          if (err) new Notice('Error launching ShareX.');
        });
      },
    });
  },
};
