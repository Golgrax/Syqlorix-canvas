document.addEventListener('DOMContentLoaded', () => {
    // --- Element References ---
    const htmlInputContainer = document.getElementById('html-input-container');
    const syqlorixOutputContainer = document.getElementById('syqlorix-output-container');
    const copyButton = document.getElementById('copy-button');
    const downloadButton = document.getElementById('download-button');
    const statusMessage = document.getElementById('status-message');
    const previewFrame = document.getElementById('preview-frame');
    
    let htmlEditor, syqlorixEditor;

    // --- Monaco Editor Initialization ---
    require.config({ paths: { 'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.34.0/min/vs' }});
    require(['vs/editor/editor.main'], () => {
        htmlEditor = monaco.editor.create(htmlInputContainer, {
            value: '<!DOCTYPE html>\n<html>\n<head>\n    <title>My Page</title>\n</head>\n<body>\n    <h1>Hello, Syqlorix!</h1>\n</body>\n</html>',
            language: 'html',
            theme: 'vs-dark',
            automaticLayout: true,
            fontFamily: 'Fira Code',
            wordWrap: 'on',
            minimap: { enabled: false }
        });

        syqlorixEditor = monaco.editor.create(syqlorixOutputContainer, {
            value: '',
            language: 'python',
            theme: 'vs-dark',
            readOnly: true,
            automaticLayout: true,
            fontFamily: 'Fira Code',
            wordWrap: 'on'
        });

        // Trigger initial conversion
        processAll(htmlEditor.getValue());

        // Listen for changes
        htmlEditor.onDidChangeModelContent(() => {
            processAll(htmlEditor.getValue());
        });
    });

    // --- Main Processing Function ---
    const processAll = (html) => {
        hideStatus();
        if (html.trim() === '') {
            syqlorixEditor.setValue('');
            previewFrame.srcdoc = initialPreviewContent;
            return;
        }

        const result = convertHtmlToSyqlorix(html);
        const previewHtml = renderPreviewFromHtml(html);

        syqlorixEditor.setValue(result.code);
        previewFrame.srcdoc = previewHtml;
    };

    // --- Syqlorix HTML Renderer Simulation ---
    const renderPreviewFromHtml = (htmlString) => {
        try {
            if (!htmlString.trim().toLowerCase().startsWith('<!doctype html>')) throw new Error("Input must be a full HTML document.");
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlString, 'text/html');
            const parseError = doc.querySelector('parsererror');
            if (parseError) throw new Error("HTML has errors. Preview is paused.");
            return `<!DOCTYPE html>\n${renderNodeAsHtml(doc.documentElement, 0)}`;
        } catch (e) {
            showStatus(e.message, 'error');
            return `<body style="font-family: sans-serif; color: #c00; display: grid; place-content: center; height: 100%; margin: 0;"><p>${e.message}</p></body>`;
        }
    };
    const renderNodeAsHtml = (node, indentLevel) => { /* ... (This function remains the same as the previous version) ... */
        const indent = "  ".repeat(indentLevel);
        const selfClosingTags = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
        if (node.nodeType === Node.TEXT_NODE) { const text = node.textContent.trim(); return text ? `${indent}${text}\n` : ''; }
        if (node.nodeType === Node.COMMENT_NODE) { const text = node.textContent.trim(); return `${indent}<!-- ${text} -->\n`; }
        if (node.nodeType === Node.ELEMENT_NODE) {
            const tagName = node.tagName.toLowerCase();
            const attributes = Array.from(node.attributes).map(attr => ` ${attr.name}="${attr.value}"`).join('');
            if (selfClosingTags.has(tagName)) { return `${indent}<${tagName}${attributes}>\n`; }
            let html = `${indent}<${tagName}${attributes}>\n`;
            Array.from(node.childNodes).forEach(child => { html += renderNodeAsHtml(child, indentLevel + 1); });
            html += `${indent}</${tagName}>\n`;
            return html;
        }
        return '';
    };


    // --- HTML to Syqlorix Python Code Converter (CORRECTED) ---
    const convertHtmlToSyqlorix = (htmlString) => {
        try {
            if (!htmlString.trim().toLowerCase().startsWith('<!doctype html>')) throw new Error("Input must be a full HTML document.");
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlString, 'text/html');
            const parseError = doc.querySelector('parsererror');
            if (parseError) throw new Error("HTML parsing error. Check for unclosed tags.");
            const rootElement = doc.documentElement;
            if (!rootElement) throw new Error("No <html> tag found.");
            
            const syqlorixCode = processNodeForPython(rootElement, 0);
            return {
                success: true,
                code: `from syqlorix import *\n\n# Main application object\ndoc = ${syqlorixCode}`
            };
        } catch (e) {
            return { success: false, code: `# Conversion failed: ${e.message}` };
        }
    };

    const processNodeForPython = (node, indentLevel) => {
        const indent = '    '.repeat(indentLevel);
        if (node.nodeType === Node.TEXT_NODE) { const text = node.textContent.trim(); return text ? `${indent}"${text.replace(/"/g, '\\"')}"` : null; }
        if (node.nodeType === Node.COMMENT_NODE) { const text = node.textContent.trim(); return `${indent}Comment("${text.replace(/"/g, '\\"')}")`; }
        if (node.nodeType === Node.ELEMENT_NODE) {
            let tagName = node.tagName.toLowerCase();
            if (['script', 'style'].includes(tagName)) return null;

            // !!!!!!!!!!! THE CRITICAL FIX !!!!!!!!!!!
            let pythonTagName = tagName;
            if (pythonTagName === 'html') pythonTagName = 'Syqlorix'; // CORRECT
            if (pythonTagName === 'input') pythonTagName = 'input_';

            const children = Array.from(node.childNodes).map(child => processNodeForPython(child, indentLevel + 1)).filter(Boolean);
            const attributes = Array.from(node.attributes).map(attr => {
                const attrName = attr.name === 'class' ? 'class_' : attr.name.replace(/-/g, '_');
                if (attr.value === '') return `${attrName}=True`;
                return `${attrName}="${attr.value.replace(/"/g, '\\"')}"`;
            });
            let args = [];
            if (children.length > 0) args.push(`\n${children.join(',\n')}\n${indent}`);
            if (attributes.length > 0) { if (children.length > 0) args.push(', '); args.push(attributes.join(', ')); }
            return `${indent}${pythonTagName}(${args.join('')})`;
        }
        return null;
    };
    
    // --- UI Event Handlers ---
    const showStatus = (message, type = 'error') => { statusMessage.textContent = message; statusMessage.className = `status ${type}`; };
    const hideStatus = () => { statusMessage.textContent = ''; statusMessage.className = 'status'; };
    const initialPreviewContent = `<body style="font-family: sans-serif; color: #555; display: grid; place-content: center; height: 100%; margin: 0;"><p>Live preview will appear here.</p></body>`;

    copyButton.addEventListener('click', () => { /* ... same as before ... */
        const code = syqlorixEditor.getValue();
        if (!code || code.startsWith('# Conversion failed:')) { showStatus('Nothing to copy or conversion failed.', 'error'); return; }
        navigator.clipboard.writeText(code).then(() => {
            copyButton.textContent = 'Copied!';
            copyButton.classList.add('copied');
            setTimeout(() => { copyButton.textContent = 'Copy'; copyButton.classList.remove('copied'); }, 2000);
        }).catch(() => showStatus('Failed to copy to clipboard.', 'error'));
    });

    downloadButton.addEventListener('click', () => {
        const code = syqlorixEditor.getValue();
        if (!code || code.startsWith('# Conversion failed:')) { showStatus('Nothing to download or conversion failed.', 'error'); return; }
        
        const blob = new Blob([code], { type: 'text/python' });
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