// content.js - This script runs on every page to check and reformat content.

let id = 1;
const el = (tag, content, parent, attrs) => {
    const element = document.createElement(tag);
    if (content != void 0) {
        if (/HTML/.test(Object.prototype.toString.call(content))) {
            element.appendChild(content);
        } else {
            element.innerText = content;
        }
    }
    if (parent) {
        parent.appendChild(element);
    }
    if (attrs) {
        for (const [key, value] of Object.entries(attrs)) {
            element.setAttribute(key, value);
        }
    }
    element.id = `json-${id++}`;
    return element;
};

const getTip = () => {
    return [].slice.call(document.querySelectorAll('.active')).pop();
};

const getAncestry = (el) => {
    let tree = [el];
    const hasParentEl = el.closest('.has-parent');
    if (hasParentEl) {
        const parentEl = document.getElementById(hasParentEl.dataset.parentId);
        tree = tree.concat(getAncestry(parentEl));
    }
    return tree;
};

const deactivate = (el) => {
    el.classList.remove('active');
    if (el.dataset.childId) {
        document.getElementById(el.dataset.childId).classList.remove('visible');
    }
};

const getBreadcrumbs = () => {
    return [].slice.call(document.querySelectorAll('.active')).map(el => el.querySelector('.key')?.innerText).filter(c => !!c);
};

const activate = (tr) => {
    const ancestry = getAncestry(tr);
    document.querySelectorAll('.active').forEach(el => {
        if (!ancestry.includes(el)) {
            console.log(`ancestry does not include ${el.id}`);
            console.log(ancestry);
            console.log('deactivating', el.id);
            deactivate(el);
        }
    });
    tr.classList.add('active');
    ancestry.forEach(el => el.classList.add('active'));
    if (tr.dataset.childId) {
        document.getElementById(tr.dataset.childId).classList.add('visible');
    }
    document.documentElement.scrollLeft = document.documentElement.scrollWidth;
    //document.documentElement.scrollTop = 0; // too annoying i think
    const breadcrumbs = getBreadcrumbs();
    breadcrumbsEl.innerText = breadcrumbs.join(' >> ');
    location.hash = breadcrumbs.join('.');
};

function Application() {
    const html = el('div');
    this.el = html;
    el('h1', 'JSON Formatted', html);
    const breadcrumbsEl = el('div', void 0, html, {class: 'breadcrumbs'});

    const rootRow = el('tr', void 0, el('tbody', void 0, el('table', void 0, html)));

    this.columns = [];
    this.columns.push(el('td', void 0, rootRow))

    this.getColumn = (depth) => {
        if (!this.columns[depth]) {
            for (let i = this.columns.length; i <= depth; i++) {
                this.columns.push(el('td', void 0, rootRow));
            }
        }
        return this.columns[depth];
    };

    const jumpIntoCol = (columnNumber) => {
        const visibleInactive = this.getColumn(columnNumber).querySelector('.visible tr');
        if (visibleInactive) {
            activate(visibleInactive);
        }
    };

    this.right = () => {
        const active = getTip();
        if (active) {
            const currentColumnTable = active.closest('.json-table');
            if (currentColumnTable) {
                jumpIntoCol(parseInt(currentColumnTable.dataset.column, 10) + 1);
            }
        } else {
            jumpIntoCol(0);
        }
    };

    this.left = () => {
        const active = getTip();
        if (active) {
            deactivate(active);
        } else {
            jumpIntoCol(0);
        }
    };
    this.up = () => {
        const active = getTip();
        if (active) {
            const prevRow = active.previousElementSibling;
            if (prevRow) {
                activate(prevRow);
            }
        } else {
            jumpIntoCol(0);
        }
    };
    this.down = () => {
        const active = getTip();
        if (active) {
            const nextRow = active.nextElementSibling;
            if (nextRow) {
                activate(nextRow);
            }
        } else {
            jumpIntoCol(0);
        }
    };

    this.keyHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.key === 'ArrowRight') {
            this.right();
        } else if (e.key === 'ArrowLeft') {
            this.left();
        } else if (e.key === 'ArrowUp') {
            this.up();
        } else if (e.key === 'ArrowDown') {
            this.down();
        }
        return false;
    };

};

Application.prototype.consume = function (json, currentDepth) {
    const column = this.getColumn(currentDepth);
    const table = el('table', void 0, column, {class: 'json-table none'});
    table.dataset.column = currentDepth;
    const rootBody = el('tbody', void 0, table);

    const addSimpleRow = (key, value, raw) => {
        const tr = el('tr', void 0, rootBody, {class: 'json-row'});
        if (key !== void 0) {
            el('td', key, tr, {class: 'key'});
        }
        if (!raw) {
            value = JSON.stringify(value);
        }
        el('td', value, tr, {class: 'value ' + (raw ? 'raw' : 'jsoned')});

        tr.addEventListener('click', (e) => {
            activate(tr);
        });
        return tr;
    };

    const addRowWithChild = (key, value) => {
        const valueType = Object.prototype.toString.call(value);
        const t = '[object Array]' === valueType ? '[]' : '{}';
        const row = addSimpleRow(key, `${t}▷`, true);
        const child = this.consume(value, currentDepth + 1);
        row.dataset.childId = child.id;
        row.classList.add('has-child');
        child.dataset.parentId = row.id;
        child.classList.add('has-parent');
        return row;
    };

    if (Object.prototype.toString.call(json) === '[object Array]') {
        if (json.length === 0) {
            addSimpleRow(void 0, '[Empty Array]', true);
        } else {
            for (let i = 0; i < json.length; i++) {
                addRowWithChild(i, json[i]);
            }
        }
    } else if (Object.prototype.toString.call(json) === '[object Object]') {
        const keys = Object.keys(json);
        if (keys.length === 0) {
            addSimpleRow(void 0, '[Empty Object]', true);
        } else {
            for (const [key, value] of Object.entries(json)) {
                const valueType = Object.prototype.toString.call(value);
                if (['[object Object]', '[object Array]'].includes(valueType)) {
                    addRowWithChild(key, value);
                } else {
                    addSimpleRow(key, value);
                }
            }
        }
    } else {
        addSimpleRow(void 0, json);
    }
    return table;
};

Application.prototype.init = function (jsonString) {
    const jsonData = JSON.parse(jsonString);

    document.open();
    document.write(this.baseHTML);
    document.close();

    this.consume(jsonData, 0);
    document.body.appendChild(this.el);
    document.querySelector('.json-table').classList.add('visible');
    document.body.addEventListener('keyup', this.keyHandler);
};

Application.prototype.baseHTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Formatted JSON</title>
<style type="text/css">
body {
  font-family: Courier New, Courier, monospace;
  color: #000;
  background-color: #EEE;
  font-size: 0.8em;
}
h1 {
  margin: 0.1em 0;
  font-size: 0.4em;
}
.none {
  display: none;
}
.json-table {
    border-collapse: collapse;
    max-width: 400px;
    border-right: 1px solid #ccc;
    margin: 0 0 1em;
    display: none;
}
.json-table.visible {
  display: table;
}
td {
  vertical-align: top;
}
.key, .value {
  padding: 0.25em;
  vertical-align: middle;
}
.key {
  text-align: left;
  padding-right: 0.5em;
}
.value {
  text-align: right;
}
.active {
  background-color: #FFF9C4;
  color: #000;
}
.jsoned {
  color:rgb(185, 97, 97);
}
</style>
</head>
<body></body>
</html>`;

/**
 * Main function to inspect and reformat the page content.
 */
function inspectAndReformatPage() {
    // Get the raw text content of the body.
    const pageContent = document.body.innerText.trim();

    // Check if the content starts with an open curly bracket or an open square bracket.
    if (pageContent.startsWith('{') || pageContent.startsWith('[')) {
        try {
            const application = new Application();
            application.init(pageContent);
        } catch (e) {
            // If parsing fails, it's not valid JSON, so do nothing.
            console.error("Unable to format JSON:", e);
        }
    }
}

// Run the function when the DOM is fully loaded.
// Using 'DOMContentLoaded' ensures the entire document is parsed,
// but 'document_start' in manifest.json means this script runs very early.
// We'll use a timeout to ensure the body content is available,
// or check document.readyState.
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inspectAndReformatPage);
} else {
    // If the document is already loaded (e.g., script injected after load), run immediately.
    inspectAndReformatPage();
}
