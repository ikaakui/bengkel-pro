const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
    fs.readdir(dir, function (err, list) {
        if (err) return callback(err);
        let pending = list.length;
        if (!pending) return callback(null);
        list.forEach(function (file) {
            file = path.resolve(dir, file);
            fs.stat(file, function (err, stat) {
                if (stat && stat.isDirectory()) {
                    walk(file, function (err) {
                        if (!--pending) callback(null);
                    });
                } else {
                    if (file.endsWith('.tsx') || file.endsWith('.jsx') || file.endsWith('.css') || file.endsWith('.ts') || file.endsWith('.js')) {
                        let content = fs.readFileSync(file, 'utf8');
                        // Use regex to remove dark: modifiers
                        // This handles dark:text-white, dark:bg-slate-900, dark:hover:bg-slate-800
                        let newContent = content.replace(/dark:[a-zA-Z0-9\-\/\[\]]+[ ]?/g, '');
                        if (content !== newContent) {
                            fs.writeFileSync(file, newContent, 'utf8');
                            console.log('Modified:', file);
                        }
                    }
                    if (!--pending) callback(null);
                }
            });
        });
    });
}

walk(path.join(__dirname, 'app'), (err) => { err && console.error(err) });
walk(path.join(__dirname, 'components'), (err) => { err && console.error(err) });
