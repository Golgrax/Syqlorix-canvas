document.addEventListener('DOMContentLoaded', () => {
    // --- UI Elements ---
    const htmlInput = document.getElementById('html-input');
    const syqlorixOutput = document.getElementById('syqlorix-output');
    const statusMessage = document.getElementById('status-message');
    const copyButton = document.getElementById('copy-button');

    // --- Syqlorix Constants ---
    const KEYWORD_MAP = { 'class': 'class_', 'for': 'for_', 'input': 'input_' };
    const BOOLEAN_ATTRIBUTES = new Set(['disabled', 'checked', 'selected', 'required', 'readonly', 'multiple', 'autoplay', 'controls', 'loop', 'muted', 'playsinline', 'defer', 'async', 'novalidate', 'formnovalidate']);

    /**
     * Main entry point for conversion. This function now orchestrates the creation of
     * a fully idiomatic Syqlorix Python script.
     * @param {string} htmlString - The full HTML document as text.
     * @returns {string} The complete and formatted Syqlorix Python script.
     */
    function convertHtmlToSyqlorix(htmlString) {
        // --- Initialization ---
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, 'text/html');

        if (doc.getElementsByTagName('parsererror').length > 0) {
            throw new Error('Invalid HTML. Check for unclosed tags or syntax errors.');
        }

        const collectedCodeBlocks = []; // To hold CSS and JS for variable definitions at the top
        const INDENT = '    ';

        // --- Processing ---
        // We now process head and body to get their component representations
        const headComponent = processNode(doc.head, 1, collectedCodeBlocks);
        const bodyComponent = processNode(doc.body, 1, collectedCodeBlocks);
        
        // --- Final Script Assembly ---
        let variableDefinitions = collectedCodeBlocks
            .map(block => `${block.name} = """\n${block.content}\n"""`)
            .join('\n\n');

        let finalScript = 'from syqlorix import *\n';
        finalScript += '# NOTE: Components, functions, and routes cannot be inferred from static HTML.\n\n';

        if (variableDefinitions) {
            finalScript += variableDefinitions + '\n\n';
        }
        
        // This part now generates the correct `doc / ...` structure
        finalScript += '# --- Build the document using the division operator for nesting ---\n';
        finalScript += 'doc = Syqlorix()\n\n';
        if (headComponent) {
            finalScript += `doc / ${headComponent}\n\n`;
        }
        if (bodyComponent) {
            finalScript += `doc / ${bodyComponent}\n`;
        }
        
        return finalScript;
    }

    /**
     * Recursively processes a single DOM node into its Syqlorix representation.
     * @param {Node} node - The DOM node to process.
     * @param {number} level - The current indentation level for pretty-printing.
     * @param {Array<Object>} collectedCodeBlocks - The accumulator for style/script content.
     * @returns {string|null} The Syqlorix string for the node, or null.
     */
    function processNode(node, level, collectedCodeBlocks) {
        const indent = '    '.repeat(level);
        
        if (node.nodeType === Node.ELEMENT_NODE) {
            let tagName = node.tagName.toLowerCase();

            // Handle internal <style> and <script> tags by extracting their content to variables
            const isInternalScript = tagName === 'script' && !node.hasAttribute('src');
            const isInternalStyle = tagName === 'style';

            if (isInternalStyle || isInternalScript) {
                const contentType = isInternalStyle ? 'css' : 'js';
                const content = node.innerHTML.trim();
                const variableName = `internal_${contentType}_${collectedCodeBlocks.filter(b => b.type === contentType).length + 1}`;
                
                collectedCodeBlocks.push({ name: variableName, content: content, type: contentType });
                return `${indent.slice(4)}${tagName}(${variableName})`;
            }

            tagName = KEYWORD_MAP[tagName] || tagName;
            const children = processChildNodes(node.childNodes, level + 1, collectedCodeBlocks);
            const attrs = processAttributes(node.attributes);
            const allArgs = [...children, ...attrs];

            if (allArgs.length === 0) return `${indent.slice(4)}${tagName}()`;

            const childIndent = '    '.repeat(level + 1);
            return `${indent.slice(4)}${tagName}(\n${childIndent}${allArgs.join(`,\n${childIndent}`)}\n${indent})`;
        }
        
        if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
            return `${indent}"${node.textContent.trim().replace(/"/g, '\\"')}"`;
        }
        
        if (node.nodeType === Node.COMMENT_NODE) {
            return `${indent}Comment("${node.textContent.trim().replace(/"/g, '\\"')}")`;
        }
        
        return null;
    }

    /**
     * Helper to process child nodes of a given node.
     */
    function processChildNodes(nodes, level, collectedCodeBlocks) {
        return Array.from(nodes)
            .map(node => processNode(node, level, collectedCodeBlocks))
            .filter(Boolean);
    }
    
    /**
     * Processes element attributes into Syqlorix keyword arguments.
     */
    function processAttributes(attributeNodes) {
        return Array.from(attributeNodes).map(attr => {
            const name = KEYWORD_MAP[attr.name.toLowerCase()] || attr.name;
            if (BOOLEAN_ATTRIBUTES.has(attr.name) && attr.value === '') {
                return `${name}=True`;
            }
            return `${name}="${attr.value.replace(/"/g, '\\"')}"`;
        });
    }

    // --- Event Handlers and Initialization ---
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
            syqlorixOutput.value = `# Error: Could not convert HTML.\n# ${error.message}`;
            statusMessage.textContent = error.message;
            statusMessage.className = 'status error';
        }
    }
    
    copyButton.addEventListener('click', () => {
        if (!syqlorixOutput.value) return;
        navigator.clipboard.writeText(syqlorixOutput.value).then(() => {
            copyButton.textContent = 'Copied!';
            copyButton.classList.add('copied');
            setTimeout(() => {
                copyButton.textContent = 'Copy Code';
                copyButton.classList.remove('copied');
            }, 2000);
        });
    });

    function setDefaultExample() {
        const defaultHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Syqlorix Demo Page</title>
    <!-- An external stylesheet link -->
    <link rel="stylesheet" href="/static/styles.css">
    <style>
        body { font-family: sans-serif; background: #1a1a2e; color: #e0e0e0; }
        .container { max-width: 800px; margin: 2rem auto; padding: 2rem; border-radius: 8px; }
    </style>
</head>
<body>
    <div class="container" id="main-content">
        <h1>Welcome!</h1>
        <p>This page was converted to a complete Syqlorix script.</p>
        <form action="/submit" method="post">
            <label for="username-field">Username:</label>
            <input class="user-input" type="text" id="username-field" name="username" required>
            <button type="submit" disabled>Submit</button>
        </form>
    </div>
    <script>
        console.log("This internal script is now a variable in Python!");
    </script>
</body>
</html>`;
        htmlInput.value = defaultHtml;
        handleInput();
    }
    
    htmlInput.addEventListener('input', handleInput);
    setDefaultExample();
});