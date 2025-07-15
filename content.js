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
        document.getElementById(el.dataset.childId).closest('.json-table-content').classList.remove('visible');
        const resizedParent = document.getElementById(el.dataset.childId).closest('.resized');
        if (resizedParent) {
            // release resizing
            resizedParent.classList.remove('resized');
            resizedParent.querySelector('.sizer').style = void 0;
        }
    }
};

const getBreadcrumbs = () => {
    const core = [].slice.call(document.querySelectorAll('.active')).map(el => {
        const rawKey = el.querySelector('.key')?.innerText;
        if (el.closest('.json-table').dataset.isArrayElement + '' === '1') {
            return `[${rawKey}]`;
        }
        return rawKey;
    }).filter(c => !!c);
    return [''].concat(core).join('.');
};

const isArrayOrObject = (value) => {
    const valueType = Object.prototype.toString.call(value);
    return ['[object Object]', '[object Array]'].includes(valueType);
};

function Application() {
    const html = el('div');
    this.el = html;
    this.breadcrumbsEl = el('div', void 0, html, {class: 'breadcrumbs'});
    this.rootRow = el('tr', void 0, el('tbody', void 0, el('table', void 0, html, {class: 'root-table'})));
    this.columns = [];
    this.summarizers = [];
    this.getColumn(0);//initialize the first column
}

Application.prototype.getColumn = function (depth) {
    if (!this.columns[depth]) {
        for (let i = this.columns.length; i <= depth; i++) {
            const contentCell = el('td', void 0, this.rootRow, {class: 'json-table-content'});
            el('div', void 0, contentCell, {class: 'sizer'});
            this.columns.push(contentCell);
            const anchorCell = el('td', void 0, this.rootRow, {class: 'json-table-anchor'});
            anchorCell.addEventListener('mousedown', this.anchorMouseDownHandler.bind(this));
        }
    }
    return this.columns[depth];
};

Application.prototype.jumpIntoCol = function (columnNumber) {
    const visibleInactive = this.getColumn(columnNumber).querySelector('.json-table.visible tr');
    if (visibleInactive) {
        this.activate(visibleInactive);
    }
};

Application.prototype.activate = function (tr) {
    const ancestry = getAncestry(tr);
    document.querySelectorAll('.active').forEach(el => {
        if (!ancestry.includes(el)) {
            deactivate(el);
        }
    });
    ancestry.forEach(el => {
        el.classList.add('active');
        el.closest('.json-table').classList.add('visible');
        el.closest('.json-table-content').classList.add('visible');
    });
    if (tr.dataset.childId) {
        document.getElementById(tr.dataset.childId).classList.add('visible');
        document.getElementById(tr.dataset.childId).closest('.json-table-content').classList.add('visible');
    }
    document.documentElement.scrollLeft = document.documentElement.scrollWidth;
    //document.documentElement.scrollTop = 0; // too annoying i think

    this.renderBreadcrumbs();
};

Application.prototype.loadBreadcrumbs = function (hash) {
    const breadcrumbs = hash.replace(/\[|\]/g, '').split('.');
    let elementToActivate = null;
    for (let i = 0; i < breadcrumbs.length; i++) {
        let queryRoot;
        if (elementToActivate) {
            if (elementToActivate.dataset.childId) {
                queryRoot = document.getElementById(elementToActivate.dataset.childId);
            } else {
                break;
            }
        } else {
            queryRoot = this.getColumn(i);
        }
        let foundRow = queryRoot.querySelector(`.json-row[data-key="${breadcrumbs[i]}"]`);
        if (foundRow) {
            elementToActivate = foundRow;
        } else {
            break;
        }
    }
    if (elementToActivate) {
        this.activate(elementToActivate);
    } else {
        this.renderBreadcrumbs();
    }
};

Application.prototype.renderBreadcrumbs = function () {
    const breadcrumbs = getBreadcrumbs();
    this.breadcrumbsEl.innerText = breadcrumbs
    location.hash = breadcrumbs;
};



Application.prototype.right = function () {
    const active = getTip();
    if (active) {
        const currentColumnTable = active.closest('.json-table');
        if (currentColumnTable) {
            this.jumpIntoCol(parseInt(currentColumnTable.dataset.column, 10) + 1);
        }
    } else {
        this.jumpIntoCol(0);
    }
};

Application.prototype.left = function () {
    const active = getTip();
    if (active) {
        deactivate(active);
    } else {
        this.jumpIntoCol(0);
    }
};

Application.prototype.up = function () {
    const active = getTip();
    if (active) {
        const prevRow = active.previousElementSibling;
        if (prevRow) {
            this.activate(prevRow);
        }
    } else {
        this.jumpIntoCol(0);
    }
};

Application.prototype.down = function () {
    const active = getTip();
    if (active) {
        const nextRow = active.nextElementSibling;
        if (nextRow) {
            this.activate(nextRow);
        }
    } else {
        this.jumpIntoCol(0);
    }
};

Application.prototype.keyHandler = function (e) {
    if (e.type === 'keydown') {
        if (['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    } else {
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
    }
};

Application.prototype.consume = function (json, currentDepth) {
    const column = this.getColumn(currentDepth);
    const table = el('table', void 0, column, {class: 'json-table none'});
    table.dataset.column = currentDepth;
    const rootBody = el('tbody', void 0, table);

    const addSimpleRow = (key, value, raw) => {
        const tr = el('tr', void 0, rootBody, {class: 'json-row'});
        tr.dataset.key = key;
        if (key !== void 0) {
            el('td', key, tr, {class: 'key'});
        }
        let classes = ['value'];
        if (raw) {
            classes.push('raw');
        } else {
            classes.push('jsoned');
            value = JSON.stringify(value);
            if (/^"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
                classes.push('date');
            }
        }
        el('td', value, tr, {class: classes.join(' ')});

        tr.addEventListener('click', (e) => {
            this.activate(tr);
        });
        return tr;
    };

    const addRowWithChild = (key, value) => {
        const valueType = Object.prototype.toString.call(value);
        const isArray = '[object Array]' === valueType;
        const t = isArray ? `[${value.length}]` : '{}';//`{${Object.keys(value).length}}`;
        const karat = el('span');

        for (const summarizer of this.summarizers) {
            if (summarizer.predicate(value)) {
                el('span', summarizer.summarize(value), karat, {class: 'summary'});
                break;
            }
        }
        el('span', `${t}▷`, karat, {class: 'karat-icon'});

        const row = addSimpleRow(key, karat, true);
        const child = this.consume(value, currentDepth + 1);
        row.dataset.childId = child.id;
        row.classList.add('has-child');
        child.dataset.parentId = row.id;
        child.dataset.isArrayElement = isArray ? '1' : '0';
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
                if (isArrayOrObject(value)) {
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

Application.prototype.mouseMoveHandler = function (e) {
    this.mouseX = e.clientX;
    this.mouseY = e.clientY;
    let info = `X: ${this.mouseX}, Y: ${this.mouseY}`;
    if (this.dragging && !!e.buttons) {
        const delta = this.mouseX - this.dragging.initialX;
        const newWidth = Math.max(1, this.dragging.initialWidth + delta);
        this.dragging.target.style.width = newWidth + 'px';
        info += `, delta: ${delta} against ${this.dragging.target.id}`;
    } else {
        this.dragging = null;
    }
    document.getElementById('mouse-position').innerText = info;
};

Application.prototype.anchorMouseDownHandler = function (e) {
    this.dragging = {
        target: e.target.previousElementSibling.querySelector('.sizer'),
        initialX: this.mouseX,
        initialWidth: e.target.previousElementSibling.offsetWidth,
    };
    e.target.previousElementSibling.classList.add('resized');
    e.preventDefault();
    e.stopPropagation();
    return false;
};

Application.prototype.mouseUpHandler = function (e) {
    this.dragging = null;
};

Application.prototype.init = function (jsonString) {
    const jsonData = JSON.parse(jsonString);

    document.open();
    document.write(this.baseHTML);
    document.close();

    this.consume(jsonData, 0);
    document.body.appendChild(this.el);
    document.querySelector('.json-table').classList.add('visible');
    document.body.addEventListener('keydown', this.keyHandler.bind(this));
    document.body.addEventListener('keyup', this.keyHandler.bind(this));

    const hash = (location.hash + '').trim().replace(/^#\.?/, '');
    if (hash) {
        this.loadBreadcrumbs(hash);
    } else {
        this.renderBreadcrumbs();
    }

    document.body.addEventListener('mousemove', this.mouseMoveHandler.bind(this));
    document.body.addEventListener('mouseup', this.mouseUpHandler.bind(this));
};

Application.prototype.registerSummarizer = function (predicate, summarize) {
    this.summarizers.push({predicate, summarize});
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
table {
  border-collapse: collapse;
}
.root-table {
  margin-top: 1.5em;
}
.breadcrumbs {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background-color:rgb(250, 250, 250);
  padding: 0.25em;
  border-bottom: 1px solid #ccc;
}
h1 {
  margin: 0.1em 0;
  font-size: 0.4em;
}
.none {
  display: none;
}
.json-table {
    margin: 0 0 1em;
    display: none;
    width:100%;
}
.json-table-anchor {
    cursor: ew-resize;
    width: 2px;
    min-width: 2px;
    background-color: #ccc;
    display: none;
}
.visible + .json-table-anchor {
  display: table-cell;
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
.active ::selection {
  background-color:rgb(255, 185, 87);
  color: #000;
}
.jsoned {
  color:rgb(185, 97, 97);
}
.raw {
  color:rgb(97, 98, 185);
}
.summary {
  font-style: italic;
  display: inline-block;
  margin-right: 1em;
}
.date {
  white-space: nowrap;
}
#mouse-position {
  position: fixed;
  bottom: 0;
  left: 0;
  z-index: 1000;
  background-color: #EEE;
}
</style>
</head>
<body>
<div id="mouse-position"></div>
</body>
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

            application.registerSummarizer((value) => {
                return value && /[Aa]ction/.test(value.apiType) && value.code;
            }, (value) => {
                return value.code;
            });

            application.registerSummarizer((value) => {
                return value && value.apiType === 'party' && value.role && value.id;
            }, (value) => {
                return value.role + '-' + value.id;
            });

            application.registerSummarizer((value) => {
                return value && value.apiType === 'period' && value.numberOfUnits !== void 0 && value.timeUnit;
            }, (value) => {
                return value.numberOfUnits + ' ' + value.timeUnit;
            });

            application.registerSummarizer((value) => {
                return value && value.apiType === 'anchor' && value.sourceId !== void 0 && value.sourceType;
            }, (value) => {
                return value.sourceType + '-' + value.sourceId;
            });

            application.registerSummarizer((value) => {
                return value && value.apiType === 'financialAmount' && value.amount !== void 0 && value.currency;
            }, (value) => {
                switch (value.currency) {
                    case 'USD':
                        return `$${value.amount.toFixed(2).replace(/(\d)(?=(\d\d\d)+(\.\d\d)?$)/g, '$1,')}`;
                    case 'EUR':
                        return `€${value.amount.toFixed(2).replace(/(\d)(?=(\d\d\d)+(\.\d\d)?$)/g, '$1,')}`;
                    default:
                        return `${value.amount.toFixed(2).replace(/(\d)(?=(\d\d\d)+(\.\d\d)?$)/g, '$1,')} ${value.currency}`;
                }
            });

            const summarizeSimpleObject = (value) => {
                let a, b;
                Object.keys(value).forEach(k => {
                    if (k !== 'apiType' || !a) {
                        a = k;
                        b = value[k];
                    }
                });
                return a + ':' + b;
            };

            application.registerSummarizer((value) => {
                return value &&
                    (
                        Object.keys(value).length === 1 ||
                        (value.apiType && Object.keys(value).length === 2)
                    ) &&
                    Object.values(value).filter(v => isArrayOrObject(v)).length === 0 &&
                    summarizeSimpleObject(value).length <= 30;
            }, summarizeSimpleObject);


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
