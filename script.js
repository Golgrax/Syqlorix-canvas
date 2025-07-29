document.addEventListener('DOMContentLoaded', () => {
    const htmlInput = document.getElementById('html-input');
    const syqlorixOutput = document.getElementById('syqlorix-output');
    const copyButton = document.getElementById('copy-button');
    const statusMessage = document.getElementById('status-message');
    const previewFrame = document.getElementById('preview-frame');

    const initialPreviewContent = `
        <body style="font-family: sans-serif; color: #555; display: grid; place-content: center; height: 100%; margin: 0;">
            <p>Live preview will appear here.</p>
        </body>
    `;
    previewFrame.srcdoc = initialPreviewContent;

    // --- Main Conversion Logic ---
    const convertHtmlToSyqlorix = (htmlString) => {
        try {
            if (!htmlString.trim().toLowerCase().startsWith('<!doctype html>')) {
                throw new Error("Input must be a full HTML document, starting with <!DOCTYPE html>.");
            }
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlString, 'text/html');
            const parseError = doc.querySelector('parsererror');
            if (parseError) {
                throw new Error("HTML parsing error. Check for unclosed tags or syntax issues.");
            }
            const rootElement = doc.documentElement;
            if (!rootElement) throw new Error("No <html> tag found.");
            
            const syqlorixCode = processNode(rootElement, 0);
            return {
                success: true,
                code: `from syqlorix import *\n\n# Main application object\ndoc = ${syqlorixCode}`
            };
        } catch (e) {
            showStatus(e.message, 'error');
            return {
                success: false,
                code: `from syqlorix import *\n\n# Conversion failed: ${e.message}`
            };
        }
    };

    // --- Recursive Node Processor ---
    const processNode = (node, indentLevel) => {
        const indent = '    '.repeat(indentLevel);
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent.trim();
            return text ? `${indent}"${text.replace(/"/g, '\\"')}"` : null;
        }
        if (node.nodeType === Node.COMMENT_NODE) {
            const text = node.textContent.trim();
            return `${indent}Comment("${text.replace(/"/g, '\\"')}")`;
        }
        if (node.nodeType === Node.ELEMENT_NODE) {
            let tagName = node.tagName.toLowerCase();
            
            // For the preview, we need the original tags, but for the code, we need the Python-safe versions
            if (['script', 'style', 'head', 'body', 'title'].includes(tagName)) return null;

            let pythonTagName = tagName;
            if (pythonTagName === 'html') pythonTagName = 'Syqlorix';
            if (pythonTagName === 'input') pythonTagName = 'input_';

            const children = Array.from(node.childNodes).map(child => processNode(child, indentLevel + 1)).filter(Boolean);
            const attributes = Array.from(node.attributes).map(attr => {
                const attrName = attr.name === 'class' ? 'class_' : attr.name.replace(/-/g, '_');
                if (attr.value === '') return `${attrName}=True`;
                return `${attrName}="${attr.value.replace(/"/g, '\\"')}"`;
            });
            
            let args = [];
            if (children.length > 0) args.push(`\n${children.join(',\n')}\n${indent}`);
            if (attributes.length > 0) {
                if (children.length > 0) args.push(', ');
                args.push(attributes.join(', '));
            }
            
            return `${indent}${pythonTagName}(${args.join('')})`;
        }
        return null;
    };
    
    // --- UI Event Handlers ---
    const showStatus = (message, type = 'error') => {
        statusMessage.textContent = message;
        statusMessage.className = `status ${type}`;
        statusMessage.style.display = 'block';
    };

    const hideStatus = () => {
        statusMessage.style.display = 'none';
        statusMessage.textContent = '';
    };

    htmlInput.addEventListener('input', () => {
        const html = htmlInput.value;
        hideStatus();

        if (html.trim() === '') {
            syqlorixOutput.value = '';
            previewFrame.srcdoc = initialPreviewContent;
            return;
        }

        const result = convertHtmlToSyqlorix(html);
        syqlorixOutput.value = result.code;
        
        if (result.success) {
            previewFrame.srcdoc = html;
        } else {
            previewFrame.srcdoc = `<body style="font-family: sans-serif; color: #c00; display: grid; place-content: center; height: 100%; margin: 0;"><p>HTML has errors. Preview is paused.</p></body>`;
        }
    });

    copyButton.addEventListener('click', () => {
        if (!syqlorixOutput.value || !syqlorixOutput.value.includes('doc = Syqlorix')) {
            showStatus('Nothing to copy or conversion failed.', 'error');
            return;
        }
        navigator.clipboard.writeText(syqlorixOutput.value).then(() => {
            copyButton.textContent = 'Copied!';
            copyButton.classList.add('copied');
            setTimeout(() => {
                copyButton.textContent = 'Copy Code';
                copyButton.classList.remove('copied');
            }, 2000);
        }).catch(() => showStatus('Failed to copy to clipboard.', 'error'));
    });
});