const examples = {
    simple: `<!DOCTYPE html>
<html>
<head>
    <title>Page Title</title>
</head>
<body>
    <h1>This is a Heading</h1>
    <p>This is a paragraph.</p>
</body>
</html>`,
    advanced: `<!DOCTYPE html>
<html>
<head>
    <title>Syqlorix - The Future is Now</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
body {
    background-color: #1a1a2e;
    color: #e0e0e0;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}
h1 {
    color: #00a8cc;
}
.container {
    max-width: 800px;
    margin: auto;
    padding: 2rem;
}
</style>
</head>
<body>
    <div class="container">
        <h1>Welcome to the Next Level</h1>
        <p>This was generated from a full HTML document.</p>
    </div>
    <script>
console.log('Syqlorix page loaded!');
</script>
</body>
</html>`,
    template: `<!DOCTYPE html>
<html>
<head>
    <title>App Template</title>
    <style>
body {
    background-color: #1a1a2e; color: #e0e0e0; font-family: sans-serif;
    display: grid; place-content: center; height: 100vh; margin: 0;
}
.container { text-align: center; max-width: 600px; padding: 2rem; border-radius: 8px; background: #2a2a4a; }
h1 { color: #00a8cc; }
nav a { margin: 0 1rem; color: #72d5ff; }
</style>
</head>
<body>
    <div class="container">
        <nav>
            <a href="/">Home</a>
            <a href="/about">About</a>
        </nav>
        <h1>Welcome to the App!</h1>
        <p>This demonstrates a common page layout.</p>
    </div>
</body>
</html>`
};

document.addEventListener('DOMContentLoaded', () => {
    // --- Element References ---
    const htmlInputContainer = document.getElementById('html-input-container');
    const syqlorixOutputContainer = document.getElementById('syqlorix-output-container');
    const copyButton = document.getElementById('copy-button');
    const downloadButton = document.getElementById('download-button');
    const statusMessage = document.getElementById('status-message');
    const exampleSelect = document.getElementById('example-select');
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
            wordWrap: 'on',
            minimap: { enabled: false }
        });

        // Trigger initial conversion
        processAll(htmlEditor.getValue(), previewFrame);

        // Listen for changes
        htmlEditor.onDidChangeModelContent(() => {
            processAll(htmlEditor.getValue(), previewFrame);
        });
    });

    // --- Main Processing Function ---
    const processAll = (html, previewFrame) => {
        hideStatus();
        if (html.trim() === '') {
            syqlorixEditor.setValue('');
            previewFrame.srcdoc = initialPreviewContent;
            previewFrame.srcdoc = previewHtml;
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
    const renderNodeAsHtml = (node, indentLevel) => {
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


    const convertHtmlToSyqlorix = (htmlString) => {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlString, 'text/html');
            const parseError = doc.querySelector('parsererror');
            if (parseError) throw new Error("HTML parsing error. Check for unclosed tags.");
            
            // Check if it's a full document or a fragment
            const isFullDocument = htmlString.trim().toLowerCase().includes('<html');

            if (isFullDocument) {
                const rootElement = doc.documentElement;
                if (!rootElement) throw new Error("No <html> tag found.");
                const syqlorixCode = processNodeForPython(rootElement, 0);
                return { success: true, code: `from syqlorix import *\n\n# Main application object\ndoc = ${syqlorixCode}` };
            } else {
                // It's a fragment. Process only the children of the <body> tag.
                const fragmentNodes = Array.from(doc.body.childNodes);
                const syqlorixCode = fragmentNodes.map(node => processNodeForPython(node, 1)).filter(Boolean).join(',\n');
                const finalCode = `from syqlorix import *\n\n` +
                                `# This code was generated from an HTML fragment.\n` +
                                `# You can add this to your Syqlorix routes.\n\n` +
                                `my_component = div(\n${syqlorixCode}\n)`;
                return { success: true, code: finalCode };
            }
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

            if (tagName === 'style' || tagName === 'script') {
                const content = node.innerHTML.trim();
                if (content) {
                    // Format as a Python multiline string
                    const pythonString = `"""\n${content}\n"""`;
                    if (tagName === 'style') {
                        return `${indent}style(${pythonString})`;
                    }
                    // For script, check for src attribute first
                    const srcAttr = node.getAttribute('src');
                    if (srcAttr) {
                        return `${indent}script(src="${srcAttr}")`;
                    }
                    return `${indent}script(${pythonString})`;
                }
                return null; // Ignore empty style/script tags
            }


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
    const showStatus = (message, type = 'error', duration = 0) => {
        statusMessage.textContent = message;
        statusMessage.className = `status ${type}`;
        if (duration > 0) {
            setTimeout(() => hideStatus(), duration);
        }
    };
    const hideStatus = () => { statusMessage.textContent = ''; statusMessage.className = 'status'; };
    const initialPreviewContent = `<body style="font-family: sans-serif; color: #555; display: grid; place-content: center; height: 100%; margin: 0;"><p>Live preview will appear here.</p></body>`;

    copyButton.addEventListener('click', () => {
        const code = syqlorixEditor.getValue();
        if (!code || code.startsWith('# Conversion failed:')) { showStatus('Nothing to copy or conversion failed.', 'error', 3000); return; }
        navigator.clipboard.writeText(code).then(() => {
            copyButton.textContent = 'Copied!';
            copyButton.classList.add('copied');
            showStatus('Code copied to clipboard!', 'success', 2000); // SUCCESS MESSAGE
            setTimeout(() => { copyButton.textContent = 'Copy'; copyButton.classList.remove('copied'); }, 2000);
        }).catch(() => showStatus('Failed to copy to clipboard.', 'error', 3000));
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

    exampleSelect.addEventListener('change', (event) => {
        const selectedExample = examples[event.target.value];
        if (selectedExample && htmlEditor) {
            htmlEditor.setValue(selectedExample);
        }
    });

});

