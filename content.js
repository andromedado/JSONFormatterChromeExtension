// content.js - This script runs on every page to check and reformat content.

// Function to load configuration from storage
function loadConfigs() {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({message: 'getConfigs'}, function(response) {
            if (chrome.runtime.lastError) {
                console.error('Error getting configs:', chrome.runtime.lastError);
                resolve({});
            } else {
                resolve(response || {});
            }
        });
    });
}

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
    return [''].concat(core).join('.') || '.';
};

const isArray = (value) => {
    const valueType = Object.prototype.toString.call(value);
    return '[object Array]' === valueType;
};

const isObject = (value) => {
    const valueType = Object.prototype.toString.call(value);
    return '[object Object]' === valueType;
};

const isArrayOrObject = (value) => {
    return isArray(value) || isObject(value);
};

function Finder(application) {
    this.application = application;
    this.el = el('div', void 0, document.body, {class: 'finder none'});
    const p = el('p', void 0, this.el);
    this.input = el('input', void 0, p, {type: 'text'});
    this.resultCounter = el('span', void 0, p, {class: 'result-counter none'});
    this.closeEl = el('span', '❌', p, {class: 'close'});
    this.closeEl.addEventListener('click', this.close.bind(this));
    this.noResults = el('p', 'No results found', this.el, {class: 'no-results none'});

    this.input.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            this.find(e.shiftKey);
        } else if (['Shift', 'Control', 'Meta', 'Alt'].includes(e.key)) {
            // ignore
        } else if (e.key === 'Escape') {
            this.close();
        } else {
            this.noResults.classList.add('none');
            this.resultCounter.classList.add('none');
        }
    });

    this.active = false;
}

Finder.prototype.find = function (reverse) {
    this.query = (this.input.value + '').trim();
    if (!this.query) {
        this.close();
        return;
    }
    if (this.query !== this.activeQuery) {
        this.activeQuery = this.query;
        const matchingKeys = Object.keys(this.application.lookup).filter(key => {
            return key.toLowerCase().includes(this.query.toLowerCase());
        });
        this.resultSet = matchingKeys.map(key => this.application.lookup[key]).flat();
        this.index = 0;
    } else {
        this.index = (this.index + (reverse ? -1 : 1) + this.resultSet.length) % this.resultSet.length;
    }
    if (this.resultSet.length > 0) {
        this.noResults.classList.add('none');
        this.resultCounter.classList.remove('none');
        this.resultCounter.innerText = `${this.index + 1}/${this.resultSet.length}`;
        this.application.activate(this.resultSet[this.index]);
    } else {
        this.noResults.classList.remove('none');
        this.resultCounter.classList.add('none');
    }
};

Finder.prototype.close = function () {
    this.el.classList.add('none');
    this.noResults.classList.add('none');
    this.resultCounter.classList.add('none');
    this.activeQuery = null;
    this.active = false;
};

Finder.prototype.init = function () {
    document.body.appendChild(this.el);
    document.body.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
            if (this.active) {
                this.close();
            } else {
                this.active = true;
                e.preventDefault();
                e.stopPropagation();
                this.el.classList.remove('none');
                this.input.focus();
                return false;
            }
        }
    });
}

function Application(booleanConfigurations) {
    this.booleanConfigurations = booleanConfigurations;
    const html = el('div');
    this.el = html;
    this.breadcrumbsEl = el('div', void 0, html, {class: 'breadcrumbs'});
    this.rootRow = el('tr', void 0, el('tbody', void 0, el('table', void 0, html, {class: 'root-table'})));
    this.columns = [];
    this.summarizers = [];
    this.complexRootKeys = [];
    this.getColumn(0);//initialize the first column
}

Application.prototype.getColumn = function (depth) {
    if (!this.columns[depth]) {
        for (let i = this.columns.length; i <= depth; i++) {
            const contentCell = el('td', void 0, this.rootRow, {class: 'json-table-content'});
            el('div', void 0, contentCell, {class: 'sizer'});
            this.columns.push(contentCell);
            const anchorCell = el('td', void 0, this.rootRow, {class: 'json-table-anchor'});
            el('div', void 0, anchorCell, {class: 'sizer'});
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

Application.prototype.addLookup = function (value, tr) {
    if (value !== void 0) {
        value = value + '';
        this.lookup[value] = this.lookup[value] || [];
        this.lookup[value].push(tr);
    }
};

Application.prototype.consume = function (json, currentDepth) {
    const column = this.getColumn(currentDepth);
    const table = el('table', void 0, column, {class: 'json-table none'});
    table.dataset.column = currentDepth;
    const rootBody = el('tbody', void 0, table);

    const addSimpleRow = (key, value, raw, omitFromLookup) => {
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
        if (!omitFromLookup) {
            this.addLookup(key, tr);
            if (!raw) {
                this.addLookup(value, tr);
            }
        }
        return tr;
    };

    const addRowWithChild = (key, value, omitFromLookup) => {
        if (currentDepth === 0) {
            this.complexRootKeys.push(key);
        }
        const valueIsArray = isArray(value);
        const childTypeHint = valueIsArray ? `[${value.length}]` : '{}';//`{${Object.keys(value).length}}`;
        const karat = el('span');

        for (const summarizer of this.summarizers) {
            if (summarizer.predicates.every(predicate => predicate.test(value))) {
                el('span', summarizer.summarizer.summarize(value), karat, {class: 'summary'});
                break;
            }
        }
        el('span', `${childTypeHint}▷`, karat, {class: 'karat-icon'});

        const row = addSimpleRow(key, karat, true, omitFromLookup);
        const child = this.consume(value, currentDepth + 1);
        row.dataset.childId = child.id;
        row.classList.add('has-child');
        child.dataset.parentId = row.id;
        child.dataset.isArrayElement = valueIsArray ? '1' : '0';
        child.classList.add('has-parent');
        return row;
    };

    if (isArray(json)) {
        if (json.length === 0) {
            addSimpleRow(void 0, '[Empty Array]', true, true);
        } else {
            for (let i = 0; i < json.length; i++) {
                addRowWithChild(i, json[i], true);
            }
        }
    } else if (isObject(json)) {
        const keys = [].slice.call(Object.keys(json));
        if (keys.length === 0) {
            addSimpleRow(void 0, '[Empty Object]', true, true);
        } else {
            if (this.booleanConfigurations.alphabetizeKeys) {
                keys.sort();
            }
            if (this.booleanConfigurations.hoistIdToTop) {
                const idKeyIndex = keys.indexOf('id');
                if (idKeyIndex !== -1) {
                    keys.splice(idKeyIndex, 1);
                    keys.unshift('id');
                }
            }
            for (const key of keys) {
                const value = json[key];
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

    if (currentDepth === 0) {
        // we've finished consuming all!
        this.rightPaddingDiv = el('div', void 0, el('td', void 0, this.rootRow), {class: 'right-padding'});
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
    const debugEl = document.getElementById('mouse-position');
    if (debugEl) {
        debugEl.innerText = info;
    }
};

Application.prototype.anchorMouseDownHandler = function (e) {
    const target = e.target.closest('.json-table-anchor').previousElementSibling;
    this.dragging = {
        target: target.querySelector('.sizer'),
        initialX: this.mouseX,
        initialWidth: target.offsetWidth,
    };
    target.classList.add('resized');
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

    this.lookup = {};
    this.consume(jsonData, 0);
    document.body.appendChild(this.el);

    document.querySelector('.json-table').classList.add('visible');
    document.querySelector('.json-table-content').classList.add('visible');

    document.body.addEventListener('keydown', this.keyHandler.bind(this));
    document.body.addEventListener('keyup', this.keyHandler.bind(this));

    let hash = (location.hash + '').trim().replace(/^#\.?/, '');
    if (!hash && this.complexRootKeys.length > 0 && this.booleanConfigurations.jumpToComplexRootKey) {
        hash = `${this.complexRootKeys[0]}`;
    }
    if (hash) {
        this.loadBreadcrumbs(hash);
    } else {
        this.renderBreadcrumbs();
    }

    document.body.addEventListener('mousemove', this.mouseMoveHandler.bind(this));
    document.body.addEventListener('mouseup', this.mouseUpHandler.bind(this));

    this.finder = new Finder(this);
    this.finder.init();
};

Application.prototype.registerSummarizer = function (summarizer, predicates) {
    if (!predicates || predicates.length === 0) {
        throw new Error('predicates is required');
    }
    if (!summarizer) {
        throw new Error('summarizer is required');
    }
    this.summarizers.push({summarizer, predicates});
};

Application.prototype.baseHTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="icon" type="image/png" href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAAAXNSR0IArs4c6QAAAIxlWElmTU0AKgAAAAgABQESAAMAAAABAAEAAAEaAAUAAAABAAAASgEbAAUAAAABAAAAUgExAAIAAAAHAAAAWodpAAQAAAABAAAAYgAAAAAAAABIAAAAAQAAAEgAAAABUGljYXNhAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAMKADAAQAAAABAAAAMAAAAACBQEUmAAAACXBIWXMAAAsTAAALEwEAmpwYAAAEGGlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iWE1QIENvcmUgNi4wLjAiPgogICA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPgogICAgICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIgogICAgICAgICAgICB4bWxuczp0aWZmPSJodHRwOi8vbnMuYWRvYmUuY29tL3RpZmYvMS4wLyIKICAgICAgICAgICAgeG1sbnM6SXB0YzR4bXBFeHQ9Imh0dHA6Ly9pcHRjLm9yZy9zdGQvSXB0YzR4bXBFeHQvMjAwOC0wMi0yOS8iCiAgICAgICAgICAgIHhtbG5zOnBob3Rvc2hvcD0iaHR0cDovL25zLmFkb2JlLmNvbS9waG90b3Nob3AvMS4wLyIKICAgICAgICAgICAgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIj4KICAgICAgICAgPHRpZmY6WVJlc29sdXRpb24+NzI8L3RpZmY6WVJlc29sdXRpb24+CiAgICAgICAgIDx0aWZmOlhSZXNvbHV0aW9uPjcyPC90aWZmOlhSZXNvbHV0aW9uPgogICAgICAgICA8dGlmZjpPcmllbnRhdGlvbj4xPC90aWZmOk9yaWVudGF0aW9uPgogICAgICAgICA8SXB0YzR4bXBFeHQ6RGlnaXRhbFNvdXJjZUZpbGVUeXBlPmh0dHA6Ly9jdi5pcHRjLm9yZy9uZXdzY29kZXMvZGlnaXRhbHNvdXJjZXR5cGUvdHJhaW5lZEFsZ29yaXRobWljTWVkaWE8L0lwdGM0eG1wRXh0OkRpZ2l0YWxTb3VyY2VGaWxlVHlwZT4KICAgICAgICAgPElwdGM0eG1wRXh0OkRpZ2l0YWxTb3VyY2VUeXBlPmh0dHA6Ly9jdi5pcHRjLm9yZy9uZXdzY29kZXMvZGlnaXRhbHNvdXJjZXR5cGUvdHJhaW5lZEFsZ29yaXRobWljTWVkaWE8L0lwdGM0eG1wRXh0OkRpZ2l0YWxTb3VyY2VUeXBlPgogICAgICAgICA8cGhvdG9zaG9wOkNyZWRpdD5NYWRlIHdpdGggR29vZ2xlIEFJPC9waG90b3Nob3A6Q3JlZGl0PgogICAgICAgICA8eG1wOkNyZWF0b3JUb29sPlBpY2FzYTwveG1wOkNyZWF0b3JUb29sPgogICAgICA8L3JkZjpEZXNjcmlwdGlvbj4KICAgPC9yZGY6UkRGPgo8L3g6eG1wbWV0YT4K1W2ojQAABJRJREFUaAXtWd1OGkEUHhD1Tq1aabU3mBiNV6WJMdrnqIm/MT4ITXkAE+NFeQGo1Bcw1V7qDU0UL2qi1yIaQGPEAirTOWc9y4js7sxiJCRsws7smW++850zszMDeEqlEvd4PKwZL84584F4n8/XjPrZ/f098zalckl0KwApGQ2ptkagIWmXnDb1CMAy+iIBAFG5XGZQOl06WCcu3AKcQHbtIAY+Xq+XqW6GgCMsBC0/2/myanM9AiAcnIN42FCKxSKOgpUjsoNowD48PJiBA5fby1UAJB6ExGIxtry8zEZHR9nU1BQ7Pz9HLbIoqp+dnbHJyUkWDH5iKysrLB6Ps7u7O0wEYXQCwT6CQJR6l8gidlhfX4fU4UeI4clkkufzeWwjDDxQHdqSyQMei0XNfpFI5BkeDQo30A4ZUIBWICRGZNoU8fNnvAIQNcLIxmpbNGoE8e79AM9mMwitxsj9a9VBu/YUEkQ4yldXV+Zoj42NYV0QYkkvqQkQFbIRZnx8HJvTZxfs8tLgIm65n10d8NoBECG8hOb1eBxXOdUSBl5+up5wkVGxrLAodiDYo2Z8FAsjlioZVMGQD6cSV0EnkFV7HSsfUtKUsuJXtbsegacOjPfiqc39k84ouQ5AzqBcdyNbR7DMD/1cByC/eJ2dnTKvUr2jo8PElcvSgiCsqgkBnHYAcGyAi5bR4eEA6+npQZuKY8J0d3ezvr4+7Hd9fY0lceOD4k0rABgyytz29i90MTs3y/r73yq6q8D8fj8eQcCys/MbG4i7grKviaMk09qJYefb3d3loVAId+HFxQV+cZEWcXEuphSWKjfCpk5P+czMF+QKh7/xvb09LkZBhQIxyjuxQGMqoEwkEiwcDuPz0Ich1tXVjXWaGvY5M1oJ+6a3lwUCATSGQl9Z4k9C6TvFEx8QhepFZ5VMJsPn5uYwc2tra9gd2qjdjk/Gra6uIsf8/DzP5vTPQ6BdawqBMAp4a2sLnQeDH3kulzODsBMPbRQkJGFkZAQ5xPuE3YjbiYPaAa/1EsPQ0fAPDg7iSO7vHzARANYFMZZ2N8Jks1l2cnKCUOIibrv+1W2uA6BDGRAWCv+qeR2fC4WCifH52rH+KgGQV9kZZZXaXrPUHoHa4hr36/YLBVA7rNewvlAAxssrTysr8YSRp5383cKqn5XddQDyNyoSo3KWIQz1AWFtbW1W+hzt2gFQtugABx6Oj43lsL3dWE1kcaSAbIQ5OvqLTQP+Aa3DIPGZpe7mIYSYmxHswoIIP5ubm/zw8JDf5m8BYmLk+s3NDf70srHxw+wXiXx/hkeDwg20a+/EsiCxlvOo+I1nQRzqYFednv7M02njcEc7roxPpVJ8YmKCi18x+NLSEo/HN3ipVESpMl5BO0IgAA/c5E3JHBqHimAwd2WY1/AFB6aH/G7UohBCIWk478mvzFWrj5UN/LoOAEjBMXycRFsJgGBgVaKVyQpnZYcA6vp7kpxTIPRs5RDsMtZt4DJ/XQEQkYpwN1jqY1dqL6N2ZI1oawXQiKzLPlsjIGejEfWmHwEfrMt0QmxEBuvxCdr/A6YaBrpbFUUjAAAAAElFTkSuQmCC">
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
.finder {
  position: fixed;
  top: 0;
  right: 2em;
  width: 20em;
  z-index: 1000;
  background-color: #FFF;
  padding: 0.5em;
  border: 1px solid #ccc;
  border-top: none;
}
.finder p {
  margin: 0.25em 0;
}
.finder input {
  width: 90%;
  box-sizing: border-box;
  background-color: #FFF;
  display:inline-block;
  color: #000;
  border-radius: 0px;
  outline: none;
}
.finder .result-counter {
  position: absolute;
  width: 85%;
  left: 0;
  margin-top: 0.25em;
  text-align: right;
}
.finder .close {
  width: 10%;
  cursor: pointer;
  text-align: right;
  display:inline-block;
}
.finder .no-results {
  font-style: italic;
}
.breadcrumbs {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background-color:rgb(250, 250, 250);
  padding: 0.15em 1em;
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
    padding:0;
}
.visible + .json-table-anchor {
  display: table-cell;
}
.json-table.visible {
  display: table;
}
.json-table-content {
  padding-top: 1.5em;
}
.json-table-content.visible .sizer {
  min-width: 5em;
}
.json-table-anchor .sizer {
  height: 100vh;
}
td {
  vertical-align: top;
}
.key, .value {
  padding: 0.25em;
  vertical-align: top;
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
  max-width: 700px;/* this is not strict on table cells, but gives browser a hint about when to start wrapping */
  overflow-wrap: break-word;
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
.right-padding {
  width: 150px;
}
</style>
</head>
<body>
<!-- <div id="mouse-position"></div> -->
</body>
</html>`;

const summarizeSimpleObject = (value, keysToIgnore) => {
    let a, b;
    keysToIgnore = keysToIgnore || [];
    Object.keys(value).forEach(k => {
        if (!keysToIgnore.includes(k) || !a) {
            a = k;
            b = value[k];
        }
    });
    return a + ':' + b;
};

function JSONPredicate(config) {
    if (!config) throw new Error('config is required');
    this.type = config.type;
    if (!this.type) throw new Error('type is required');
    switch (this.type) {
        case 'keysPresent':
            if (!config.keys) throw new Error('keys is required');
            this.keys = config.keys;
            break;
        case 'anyKeyPresent':
            if (!config.keys) throw new Error('keys is required');
            this.keys = config.keys;
            break;
        case 'valueRegex':
            if (!config.key) throw new Error('key is required');
            if (!config.regex) throw new Error('regex is required');
            this.key = config.key;
            this.regex = new RegExp(config.regex);
            break;
        case 'simpleObject':
            this.maxLength = config.maxLength || 30;
            this.keysToIgnore = config.keysToIgnore || [];
            break;
        default:
            throw new Error('Invalid predicate type: ' + config.type);
    }
}

JSONPredicate.prototype.test = function (value) {
    if (value) {
        switch (this.type) {
            case 'keysPresent':
                return this.keys.every(key => value[key] !== void 0);
            case 'anyKeyPresent':
                return this.keys.some(key => value[key] !== void 0);
            case 'valueRegex':
                return this.regex.test(value[this.key]);
            case 'simpleObject':
                const relevantKeys = Object.keys(value).filter(k => !this.keysToIgnore.includes(k));
                return relevantKeys.length === 1 &&
                    Object.values(value).filter(v => isArrayOrObject(v)).length === 0 &&
                    summarizeSimpleObject(value, this.keysToIgnore).length <= this.maxLength;
        }
    }
    return false;
};

function JSONSummarizer(config) {
    if (!config) throw new Error('config is required');
    this.type = config.type;
    if (!this.type) throw new Error('type is required');
    switch (this.type) {
        case 'static':
            if (config.value === void 0) throw new Error('value is required');
            this.value = config.value;
            break;
        case 'keyValue':
            if (!config.key) throw new Error('key is required');
            this.key = config.key;
            break;
        case 'joinedValues':
            if (!config.keys) throw new Error('keys is required');
            this.keys = config.keys;
            this.joiner = config.joiner || '-';
            break;
        case 'financialAmount':
            if (!config.amountKey) throw new Error('amountKey is required');
            if (!config.currencyKey) throw new Error('currencyKey is required');
            this.amountKey = config.amountKey;
            this.currencyKey = config.currencyKey;
            break;
        case 'simpleObject':
            this.maxLength = config.maxLength || 30;
            this.keysToIgnore = config.keysToIgnore || [];
            break;
        default:
            throw new Error('Invalid summarizer type: ' + config.type);
    }
}

JSONSummarizer.prototype.summarize = function (value) {
    if (value === void 0) {
        return;
    }
    switch (this.type) {
        case 'static':
            return this.value;
        case 'keyValue':
            return value[this.key];
        case 'joinedValues':
            return this.keys.map(key => value[key]).filter(v => v !== void 0).join(this.joiner);
        case 'financialAmount':
            const amount = value[this.amountKey];
            const currency = value[this.currencyKey].toUpperCase();
            switch (currency) {
                case 'USD':
                    return `$${amount.toFixed(2).replace(/(\d)(?=(\d\d\d)+(\.\d\d)?$)/g, '$1,')}`;
                case 'EUR':
                    return `€${amount.toFixed(2).replace(/(\d)(?=(\d\d\d)+(\.\d\d)?$)/g, '$1,')}`;
                default:
                    return `${amount.toFixed(2).replace(/(\d)(?=(\d\d\d)+(\.\d\d)?$)/g, '$1,')} ${currency}`;
            }
        case 'simpleObject':
            return summarizeSimpleObject(value, this.keysToIgnore);
    }
};

async function initializeExtension() {
    // Get the raw text content of the body.
    const pageContent = document.body.innerText.trim();
    // Check if the content starts with an open curly bracket or an open square bracket.
    if (pageContent.startsWith('{') || pageContent.startsWith('[')) {
        try {
            // Load configuration from storage before proceeding
            const appConfigs = await loadConfigs();
            const summarizationConfiguration = appConfigs.summarizationConfiguration || [];
            const booleanConfigurations = appConfigs.booleanConfigurations || {};

            const application = new Application(booleanConfigurations);

            for (const summarizeConfig of summarizationConfiguration) {
                const summarizer = new JSONSummarizer(summarizeConfig.summarizer);
                const predicates = summarizeConfig.predicates.map(predicate => new JSONPredicate(predicate));
                application.registerSummarizer(summarizer, predicates);
            }

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
    document.addEventListener('DOMContentLoaded', () => {
        initializeExtension().catch(console.error);
    });
} else {
    // If the document is already loaded (e.g., script injected after load), run immediately.
    initializeExtension().catch(console.error);
}


