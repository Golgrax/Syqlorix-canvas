document.addEventListener('DOMContentLoaded', () => {
    const htmlInput = document.getElementById('html-input');
    const syqlorixOutput = document.getElementById('syqlorix-output');
    const statusMessage = document.getElementById('status-message');
    const copyButton = document.getElementById('copy-button');

    const KEYWORD_MAP = { 'class': 'class_', 'for': 'for_', 'input': 'input_' };
    const BOOLEAN_ATTRIBUTES = new Set(['disabled', 'checked', 'selected', 'required', 'readonly', 'multiple', 'autoplay', 'controls', 'loop', 'muted', 'playsinline', 'defer', 'async']);

    /**
     * The main conversion function. Generates a complete Syqlorix Python script.
     * @param {string} htmlString - The full HTML document to convert.
     * @returns {string} The resulting Syqlorix Python script.
     */
    function convertHtmlToSyqlorix(htmlString) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, 'text/html');

        if (doc.getElementsByTagName('parsererror').length > 0) {
            throw new Error('Invalid HTML. Check for unclosed tags or syntax errors.');
        }

        const headNode = doc.head;
        const bodyNode = doc.body;

        const headContent = headNode ? Array.from(headNode.childNodes).map(node => processNode(node, 1)).filter(Boolean) : [];
        const bodyContent = bodyNode ? Array.from(bodyNode.childNodes).map(node => processNode(node, 1)).filter(Boolean) : [];
        
        const indent = '    ';
        let headBlock = '';
        if (headContent.length > 0) {
            headBlock = `head(\n${indent.repeat(2)}${headContent.join(`,\n${indent.repeat(2)}`)}\n${indent})`;
        }

        let bodyBlock = '';
        if (bodyContent.length > 0) {
            bodyBlock = `body(\n${indent.repeat(2)}${bodyContent.join(`,\n${indent.repeat(2)}`)}\n${indent})`;
        }
        
        const finalArgs = [headBlock, bodyBlock].filter(Boolean).join(',\n' + indent);

        return `from syqlorix import *\n\n# The <!DOCTYPE html> is added automatically by Syqlorix during rendering.\ndoc = Syqlorix(\n${indent}${finalArgs}\n)\n`;
    }

    /**
     * Recursively processes a single DOM node into its Syqlorix representation.
     * @param {Node} node - The DOM node to process.
     * @param {number} indentLevel - The current indentation level.
     * @returns {string|null} The Syqlorix string for the node, or null.
     */
    function processNode(node, indentLevel) {
        const indent = '    '.repeat(indentLevel);

        // Case 1: Element Node (e.g., <div>, <p>, <style>)
        if (node.nodeType === Node.ELEMENT_NODE) {
            let tagName = node.tagName.toLowerCase();

            // Special handling for style tags - use multiline string content
            if (tagName === 'style') {
                const styleContent = node.innerHTML.trim();
                return `${indent}style("""\n${styleContent}\n${indent}""")`;
            }

            // Special handling for script tags
            if (tagName === 'script') {
                if (node.hasAttribute('src')) {
                    const attrs = processAttributes(node.attributes, indentLevel);
                    return `${indent}script(${attrs.join(', ')})`;
                }
                const scriptContent = node.innerHTML.trim();
                return `${indent}script("""\n${scriptContent}\n${indent}""")`;
            }
            
            tagName = KEYWORD_MAP[tagName] || tagName;

            const children = Array.from(node.childNodes).map(child => processNode(child, indentLevel + 1)).filter(Boolean);
            const attrs = processAttributes(node.attributes, indentLevel);
            const allArgs = [...children, ...attrs];

            if (allArgs.length === 0) {
                return `${indent}${tagName}()`;
            }
            const childrenIndent = '    '.repeat(indentLevel + 1);
            return `${indent}${tagName}(\n${childrenIndent}${allArgs.join(`,\n${childrenIndent}`)}\n${indent})`;
        }
        
        // Case 2: Text Node
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent;
            // Ignore text nodes that are only whitespace
            if (text.trim()) {
                // Use triple quotes for multiline text, otherwise regular quotes.
                // Escape backslashes for Python.
                const escapedText = text.replace(/\\/g, '\\\\');
                if (escapedText.includes('\n')) {
                    return `${indent}"""${escapedText}"""`;
                }
                return `${indent}"${escapedText.replace(/"/g, '\\"')}"`;
            }
        }
        
        // Case 3: Comment Node
        if (node.nodeType === Node.COMMENT_NODE) {
            const commentText = node.textContent.trim().replace(/"/g, '\\"');
            return `${indent}Comment("${commentText}")`;
        }
        
        return null; // Ignore other node types
    }

    /**
     * Processes a Node's attributes into a list of Syqlorix keyword arguments.
     * @param {NamedNodeMap} attributeNodes - The attributes from a DOM node.
     * @param {number} indentLevel - The current indentation level.
     * @returns {string[]} An array of formatted attribute strings.
     */
    function processAttributes(attributeNodes, indentLevel) {
        return Array.from(attributeNodes).map(attr => {
            const name = KEYWORD_MAP[attr.name] || attr.name;
            if (BOOLEAN_ATTRIBUTES.has(attr.name) && attr.value === '') {
                return `${name}=True`;
            }
            const value = attr.value.replace(/"/g, '\\"');
            return `${name}="${value}"`;
        });
    }

    // Real-time conversion logic
    function handleInput() {
        const html = htmlInput.value;
        if (!html.trim()) {
            syqlorixOutput.value = '';
            statusMessage.style.display = 'none';
            return;
        }

        try {
            const syqlorixCode = convertHtmlToSyqlorix(html);
            syqlorixOutput.value = syqlorixCode;
            statusMessage.style.display = 'none';
        } catch (error) {
            syqlorixOutput.value = `# Error: Could not convert HTML.\n\n# ${error.message}`;
            statusMessage.textContent = error.message;
            statusMessage.className = 'status error';
        }
    }
    
    // Copy to clipboard functionality
    copyButton.addEventListener('click', () => {
        if (!syqlorixOutput.value) return;
        
        navigator.clipboard.writeText(syqlorixOutput.value).then(() => {
            copyButton.textContent = 'Copied!';
            copyButton.classList.add('copied');
            setTimeout(() => {
                copyButton.textContent = 'Copy Code';
                copyButton.classList.remove('copied');
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            statusMessage.textContent = 'Failed to copy code to clipboard.';
            statusMessage.className = 'status error';
        });
    });
    
    // Set a comprehensive default example on page load
    function setDefaultExample() {
        const defaultHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Sample Page</title>
    <style>
        body { font-family: sans-serif; background: #333; color: #fff; }
        .container { max-width: 800px; margin: 2rem auto; }
    </style>
</head>
<body>
    <!-- This is a demonstration -->
    <div class="container" id="main-content">
        <h1>Welcome!</h1>
        <p>This demonstrates the converter.</p>
        <form action="/submit" method="post">
            <label for="name">Name:</label>
            <input class="user-input" type="text" id="name" name="username" required>
            <input type="submit" value="Submit" disabled>
        </form>
    </div>
    <script src="/assets/main.js" defer></script>
</body>
</html>`;
        htmlInput.value = defaultHtml;
        handleInput();
    }
    
    // Attach event listeners and run on load
    htmlInput.addEventListener('input', handleInput);
    setDefaultExample();
});