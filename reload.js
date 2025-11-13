module.exports = {};
module.exports.onload = function (plugin) {
  plugin.addCommand({
    id: 'reload-page',
    name: 'Reload page',
    callback: () => {
      app.workspace.activeLeaf?.rebuildView();
    },
  });
};
