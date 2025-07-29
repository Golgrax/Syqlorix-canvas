document.addEventListener('DOMContentLoaded', () => {
    const htmlInput = document.getElementById('html-input');
    const syqlorixOutput = document.getElementById('syqlorix-output');
    const copyButton = document.getElementById('copy-button');
    const statusMessage = document.getElementById('status-message');

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
                throw new Error("HTML parsing error. Please check your document for issues.");
            }

            const rootElement = doc.documentElement; // This is the <html> tag
            if (!rootElement) {
                throw new Error("No <html> tag found in the document.");
            }
            
            // The main recursive call
            const syqlorixCode = processNode(rootElement, 0);

            // Wrap in the final Syqlorix application structure
            return `from syqlorix import *\n\n# Main application object\ndoc = ${syqlorixCode}`;

        } catch (e) {
            showStatus(e.message, 'error');
            return `from syqlorix import *\n\n# Conversion failed: ${e.message}`;
        }
    };

    // --- Recursive Node Processor ---

    const processNode = (node, indentLevel) => {
        const indent = '    '.repeat(indentLevel);

        // 1. Handle Text Nodes
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent.trim();
            return text ? `${indent}"${text.replace(/"/g, '\\"')}"` : null;
        }

        // 2. Handle Comment Nodes
        if (node.nodeType === Node.COMMENT_NODE) {
            const text = node.textContent.trim();
            return `${indent}Comment("${text.replace(/"/g, '\\"')}")`;
        }
        
        // 3. Handle Element Nodes
        if (node.nodeType === Node.ELEMENT_NODE) {
            let tagName = node.tagName.toLowerCase();
            
            // Skip elements that Syqlorix handles differently
            if (['script', 'style'].includes(tagName)) return null; 

            // Handle special Syqlorix class names and Python keywords
            if (tagName === 'html') tagName = 'Syqlorix';
            if (tagName === 'input') tagName = 'input_';

            const children = Array.from(node.childNodes)
                .map(child => processNode(child, indentLevel + 1))
                .filter(child => child !== null); // Filter out null results

            const attributes = Array.from(node.attributes)
                .map(attr => {
                    const attrName = attr.name === 'class' ? 'class_' : attr.name.replace(/-/g, '_');
                    // For boolean attributes (e.g., 'disabled'), handle them correctly
                    if (attr.value === '') return `${attrName}=True`;
                    return `${attrName}="${attr.value.replace(/"/g, '\\"')}"`;
                });
            
            let args = [];
            if (children.length > 0) {
                 args.push(`\n${children.join(',\n')}\n${indent}`);
            }
            if (attributes.length > 0) {
                // Add a comma if there are children
                if (children.length > 0) args.push(', ');
                args.push(attributes.join(', '));
            }
            
            return `${indent}${tagName}(${args.join('')})`;
        }

        return null; // Ignore other node types
    };
    
    // --- UI Event Handlers ---

    const showStatus = (message, type = 'info') => {
        statusMessage.textContent = message;
        statusMessage.className = `status ${type}`;
    };

    htmlInput.addEventListener('input', () => {
        const html = htmlInput.value;
        if (html.trim() === '') {
            syqlorixOutput.value = '';
            statusMessage.style.display = 'none';
            return;
        }
        statusMessage.style.display = 'none';
        const result = convertHtmlToSyqlorix(html);
        syqlorixOutput.value = result;
    });

    copyButton.addEventListener('click', () => {
        if (!syqlorixOutput.value || syqlorixOutput.value.startsWith('from syqlorix import *\n\n# Conversion failed:')) {
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
        }).catch(() => {
            showStatus('Failed to copy to clipboard.', 'error');
        });
    });
});