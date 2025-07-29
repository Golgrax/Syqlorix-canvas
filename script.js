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

    // ========================================================================
    // NEW: Syqlorix HTML Renderer Simulation in JavaScript
    // ========================================================================
    const renderPreviewFromHtml = (htmlString) => {
        try {
            // We use the same parser and validation as the converter
            if (!htmlString.trim().toLowerCase().startsWith('<!doctype html>')) {
                throw new Error("Input must be a full HTML document.");
            }
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlString, 'text/html');
            const parseError = doc.querySelector('parsererror');
            if (parseError) throw new Error("HTML has errors. Preview is paused.");
            
            // Re-render the document from the DOM tree, simulating Syqlorix's output
            return `<!DOCTYPE html>\n${renderNodeAsHtml(doc.documentElement, 0)}`;

        } catch (e) {
            showStatus(e.message, 'error');
            return `<body style="font-family: sans-serif; color: #c00; display: grid; place-content: center; height: 100%; margin: 0;"><p>${e.message}</p></body>`;
        }
    };

    const renderNodeAsHtml = (node, indentLevel) => {
        const indent = "  ".repeat(indentLevel);
        const selfClosingTags = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);

        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent.trim();
            return text ? `${indent}${text}\n` : '';
        }

        if (node.nodeType === Node.COMMENT_NODE) {
            const text = node.textContent.trim();
            return `${indent}<!-- ${text} -->\n`;
        }

        if (node.nodeType === Node.ELEMENT_NODE) {
            const tagName = node.tagName.toLowerCase();
            const attributes = Array.from(node.attributes).map(attr => ` ${attr.name}="${attr.value}"`).join('');
            
            if (selfClosingTags.has(tagName)) {
                return `${indent}<${tagName}${attributes}>\n`;
            }

            let html = `${indent}<${tagName}${attributes}>\n`;
            Array.from(node.childNodes).forEach(child => {
                html += renderNodeAsHtml(child, indentLevel + 1);
            });
            html += `${indent}</${tagName}>\n`;
            return html;
        }
        return '';
    };


    // ========================================================================
    // HTML to Syqlorix Python Code Converter (Updated)
    // ========================================================================
    const convertHtmlToSyqlorix = (htmlString) => {
        try {
            if (!htmlString.trim().toLowerCase().startsWith('<!doctype html>')) {
                throw new Error("Input must be a full HTML document.");
            }
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
            return {
                success: false,
                code: `from syqlorix import *\n\n# Conversion failed: ${e.message}`
            };
        }
    };

    const processNodeForPython = (node, indentLevel) => {
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
            
            // Skip tags that Syqlorix would handle as strings inside other tags
            if (['script', 'style'].includes(tagName)) return null;

            let pythonTagName = tagName;
            if (pythonTagName === 'html') pythonTagName = 'Syqlorix';
            if (pythonTagName === 'input') pythonTagName = 'input_';

            const children = Array.from(node.childNodes).map(child => processNodeForPython(child, indentLevel + 1)).filter(Boolean);
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
    };

    const hideStatus = () => {
        statusMessage.textContent = '';
        statusMessage.className = 'status';
    };

    htmlInput.addEventListener('input', () => {
        const html = htmlInput.value;
        hideStatus();

        if (html.trim() === '') {
            syqlorixOutput.value = '';
            previewFrame.srcdoc = initialPreviewContent;
            return;
        }

        // Run both processes: conversion and simulation
        const result = convertHtmlToSyqlorix(html);
        const previewHtml = renderPreviewFromHtml(html);

        syqlorixOutput.value = result.code;
        previewFrame.srcdoc = previewHtml;
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