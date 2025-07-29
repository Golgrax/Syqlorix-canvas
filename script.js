document.addEventListener('DOMContentLoaded', () => {
    // --- Syqlorix Data (Extracted from your provided source) ---
    const SYQLORIX_SELF_CLOSING_TAGS = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
    const SYQLORIX_TAG_NAMES = [
        'a', 'abbr', 'address', 'article', 'aside', 'audio', 'b', 'bdi', 'bdo', 'blockquote', 'button', 'canvas', 'caption', 'cite', 'code', 'data', 'datalist', 'dd', 'details', 'dfn', 'dialog', 'div', 'dl', 'dt', 'em', 'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'i', 'iframe', 'img', 'input', 'ins', 'kbd', 'label', 'legend', 'li', 'link', 'main', 'map', 'mark', 'meta', 'meter', 'nav', 'noscript', 'object', 'ol', 'optgroup', 'option', 'output', 'p', 'picture', 'pre', 'progress', 'q', 'rp', 'rt', 'ruby', 's', 'samp', 'section', 'select', 'small', 'source', 'span', 'strong', 'summary', 'sup', 'table', 'tbody', 'td', 'template', 'textarea', 'tfoot', 'th', 'thead', 'time', 'title', 'tr', 'u', 'ul', 'var', 'video', 'br', 'hr'
    ];

    // --- DOM Elements ---
    const syqlorixOutput = document.getElementById('syqlorix-output');
    const copyButton = document.getElementById('copy-button');
    const downloadButton = document.getElementById('download-button');
    const statusMessage = document.getElementById('status-message');
    const previewFrame = document.getElementById('preview-frame');

    let htmlEditor;

    // --- Monaco Editor Setup ---
    require.config({ paths: { 'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.41.0/min/vs' }});
    require(['vs/editor/editor.main'], function () {
        // --- Autocomplete Provider ---
        monaco.languages.registerCompletionItemProvider('html', {
            provideCompletionItems: function(model, position) {
                const suggestions = SYQLORIX_TAG_NAMES.map(tag => ({
                    label: tag,
                    kind: monaco.languages.CompletionItemKind.Keyword,
                    insertText: tag,
                    range: model.getWordUntilPosition(position)
                }));
                return { suggestions: suggestions };
            }
        });

        // --- Editor Initialization ---
        htmlEditor = monaco.editor.create(document.getElementById('html-editor'), {
            value: '<!DOCTYPE html>\n<html lang="en">\n<head>\n    <title>My Syqlorix App</title>\n</head>\n<body>\n    <h1>Hello, Syqlorix!</h1>\n</body>\n</html>',
            language: 'html',
            theme: 'vs-dark',
            automaticLayout: true,
            fontFamily: 'Fira Code',
            fontLigatures: true,
            fontSize: 14,
        });

        // --- Event Listener ---
        htmlEditor.onDidChangeModelContent(() => {
            const html = htmlEditor.getValue();
            updateAllOutputs(html);
        });

        // Initial conversion on load
        updateAllOutputs(htmlEditor.getValue());
    });

    // --- Main Update Function ---
    const updateAllOutputs = (html) => {
        hideStatus();
        if (html.trim() === '') {
            syqlorixOutput.value = '';
            previewFrame.srcdoc = '';
            return;
        }

        const result = convertHtmlToSyqlorix(html);
        const previewHtml = renderPreviewFromHtml(html);

        syqlorixOutput.value = result.code;
        previewFrame.srcdoc = previewHtml;
    };

    // --- Syqlorix HTML Renderer Simulation ---
    const renderPreviewFromHtml = (htmlString) => {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlString, 'text/html');
            if (doc.querySelector('parsererror')) throw new Error("HTML has errors. Preview paused.");
            return `<!DOCTYPE html>\n${renderNodeAsHtml(doc.documentElement, 0)}`;
        } catch (e) {
            showStatus(e.message, 'error');
            return `<body style="font-family: sans-serif; color: #c00; display: grid; place-content: center; height: 100%; margin: 0;"><p>${e.message}</p></body>`;
        }
    };
    const renderNodeAsHtml = (node, indentLevel) => {
        const indent = "  ".repeat(indentLevel);
        if (node.nodeType === 3) return node.textContent.trim() ? `${indent}${node.textContent.trim()}\n` : '';
        if (node.nodeType === 8) return `${indent}<!-- ${node.textContent.trim()} -->\n`;
        if (node.nodeType === 1) {
            const tagName = node.tagName.toLowerCase();
            const attrs = Array.from(node.attributes).map(a => ` ${a.name}="${a.value}"`).join('');
            if (SYQLORIX_SELF_CLOSING_TAGS.has(tagName)) return `${indent}<${tagName}${attrs}>\n`;
            let html = `${indent}<${tagName}${attrs}>\n`;
            node.childNodes.forEach(child => html += renderNodeAsHtml(child, indentLevel + 1));
            html += `${indent}</${tagName}>\n`;
            return html;
        }
        return '';
    };

    // --- HTML to Syqlorix Python Code Converter ---
    const convertHtmlToSyqlorix = (htmlString) => {
        try {
            if (!htmlString.trim().toLowerCase().startsWith('<!doctype html>')) throw new Error("Input must be a full HTML document.");
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlString, 'text/html');
            if (doc.querySelector('parsererror')) throw new Error("HTML parsing error. Check syntax.");
            const rootElement = doc.documentElement;
            if (!rootElement) throw new Error("No <html> tag found.");

            const mainContent = processNodeForPython(rootElement, 1);
            const fullScript = `from syqlorix import *\n\n# Main application object\ndoc = Syqlorix()\n\n# Define a route for the root URL\n@doc.route('/')\ndef main_page(request):\n    return ${mainContent}\n\n# To run this script, save it as app.py and run:\n# syqlorix run app.py`;
            return { success: true, code: fullScript };
        } catch (e) {
            showStatus(e.message, 'error');
            return { success: false, code: `# Conversion failed: ${e.message}` };
        }
    };
    const processNodeForPython = (node, indentLevel) => {
        const indent = '    '.repeat(indentLevel);
        if (node.nodeType === 3) return node.textContent.trim() ? `${indent}"${node.textContent.trim().replace(/"/g, '\\"')}"` : null;
        if (node.nodeType === 8) return `${indent}Comment("${node.textContent.trim().replace(/"/g, '\\"')}")`;
        if (node.nodeType === 1) {
            let tagName = node.tagName.toLowerCase();
            if (tagName === 'input') tagName = 'input_';
            
            const children = Array.from(node.childNodes).map(child => processNodeForPython(child, indentLevel + 1)).filter(Boolean);
            const attrs = Array.from(node.attributes).map(attr => {
                const name = attr.name === 'class' ? 'class_' : attr.name.replace(/-/g, '_');
                return attr.value === '' ? `${name}=True` : `${name}="${attr.value.replace(/"/g, '\\"')}"`;
            });

            const args = [];
            if (children.length > 0) args.push(`\n${children.join(',\n')}\n${indent}`);
            if (attrs.length > 0) {
                if (children.length > 0) args.push(', ');
                args.push(attrs.join(', '));
            }
            return `${indent}${tagName}(${args.join('')})`;
        }
        return null;
    };
    
    // --- UI Helpers ---
    const showStatus = (message, type) => {
        statusMessage.textContent = message;
        statusMessage.className = `status ${type}`;
    };
    const hideStatus = () => statusMessage.className = 'status';

    copyButton.addEventListener('click', () => {
        if (!syqlorixOutput.value || syqlorixOutput.value.startsWith('# Conversion failed:')) return;
        navigator.clipboard.writeText(syqlorixOutput.value).then(() => {
            copyButton.textContent = 'Copied!';
            copyButton.classList.add('copied');
            setTimeout(() => { copyButton.textContent = 'Copy'; copyButton.classList.remove('copied'); }, 2000);
        });
    });

    downloadButton.addEventListener('click', () => {
        if (!syqlorixOutput.value || syqlorixOutput.value.startsWith('# Conversion failed:')) return;
        const blob = new Blob([syqlorixOutput.value], { type: 'text/python' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'app.py';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
});