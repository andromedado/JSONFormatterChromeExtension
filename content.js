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

function convertJSONToHtml(data) {
    const html = el('div');
    el('h1', 'JSON Formatted', html);
    const breadcrumbsEl = el('div', void 0, html, {class: 'breadcrumbs'});

    const rootRow = el('tr', void 0, el('tbody', void 0, el('table', void 0, html)));

    const columns = [];
    columns.push(el('td', void 0, rootRow))

    const getColumn = (depth) => {
        if (!columns[depth]) {
            for (let i = columns.length; i <= depth; i++) {
                columns.push(el('td', void 0, rootRow));
            }
        }
        return columns[depth];
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
            document.getElementById(el.dataset.childId).classList.add('none');
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
            document.getElementById(tr.dataset.childId).classList.remove('none');
        }
        document.documentElement.scrollLeft = document.documentElement.scrollWidth;
        //document.documentElement.scrollTop = 0; // too annoying i think
        const breadcrumbs = getBreadcrumbs();
        breadcrumbsEl.innerText = breadcrumbs.join(' >> ');
        location.hash = breadcrumbs.join('.');
    };

    const consume = (json, currentDepth) => {
        const column = getColumn(currentDepth);
        const table = el('table', void 0, column, {class: 'json-table none'});
        const rootBody = el('tbody', void 0, table);

        const addSimpleRow = (key, value, raw) => {
            const tr = el('tr', void 0, rootBody);
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
            const child = consume(value, currentDepth + 1);
            row.dataset.childId = child.id;
            row.classList.add('has-child');
            child.dataset.parentId = row.id;
            child.classList.add('has-parent');
            return child;
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
            for (const [key, value] of Object.entries(json)) {
                const valueType = Object.prototype.toString.call(value);
                if (['[object Object]', '[object Array]'].includes(valueType)) {
                    addRowWithChild(key, value);
                } else {
                    addSimpleRow(key, value);
                }
            }
        } else {
            addSimpleRow(void 0, json);
        }
        return table;
    };

    consume(data, 0);

    return html;
}
  
/**
 * Main function to inspect and reformat the page content.
 */
function inspectAndReformatPage() {
    // Get the raw text content of the body.
    const pageContent = document.body.innerText.trim();

    // Check if the content starts with an open curly bracket or an open square bracket.
    if (pageContent.startsWith('{') || pageContent.startsWith('[')) {
        try {
        // Attempt to parse the content as JSON.
        const jsonData = JSON.parse(pageContent);

        // Create a new HTML structure for the formatted JSON.
        const newHtml = `
<!DOCTYPE html>
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
</html>
`;

        // Replace the entire document's HTML with the new formatted content.
        document.open();
        document.write(newHtml);
        document.close();

        const html = convertJSONToHtml(jsonData);
        document.body.appendChild(html);
        document.querySelector('.json-table').classList.remove('none');

        } catch (e) {
        // If parsing fails, it's not valid JSON, so do nothing.
        console.error("Content starts with [ or { but is not valid JSON:", e);
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
