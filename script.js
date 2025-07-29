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
     * Main entry point for conversion.
     * @param {string} htmlString The full HTML document as text.
     * @returns {string} The complete and formatted Syqlorix Python script.
     */
    function convertHtmlToSyqlorix(htmlString) {
        // --- Initialization ---
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, 'text/html');

        // Check for parsing errors which indicate invalid HTML
        if (doc.getElementsByTagName('parsererror').length > 0) {
            throw new Error('Invalid HTML. Check for unclosed tags or syntax errors.');
        }

        const collectedCodeBlocks = []; // To hold CSS and JS for variable definitions
        const INDENT = '    '; // Standard Python indentation

        // --- Processing ---
        const headNode = doc.head;
        const bodyNode = doc.body;

        const headContent = processChildNodes(headNode.childNodes, 2, collectedCodeBlocks);
        const bodyContent = processChildNodes(bodyNode.childNodes, 2, collectedCodeBlocks);

        // --- Assembly ---
        let variableDefinitions = collectedCodeBlocks
            .map(block => `${block.name} = """${block.content}"""`)
            .join('\n\n');
        
        const headBlock = headContent.length > 0
            ? `${INDENT}head(\n${headContent.join(',\n')}\n${INDENT})`
            : '';
            
        const bodyBlock = bodyContent.length > 0
            ? `${INDENT}body(\n${bodyContent.join(',\n')}\n${INDENT})`
            : '';

        const docArgs = [headBlock, bodyBlock].filter(Boolean).join(`,\n`);
        
        let finalScript = 'from syqlorix import *\n\n';
        finalScript += '# NOTE: The <!DOCTYPE> declaration is automatically handled by Syqlorix.\n\n';

        if(variableDefinitions){
            finalScript += variableDefinitions + '\n\n';
        }
        
        finalScript += `doc = Syqlorix(\n${docArgs}\n)`;
        
        return finalScript;
    }

    /**
     * Processes an array of DOM nodes recursively.
     * @param {NodeListOf<ChildNode>} nodes The list of nodes to process.
     * @param {number} level The current indentation level.
     * @param {Array<Object>} collectedCodeBlocks The accumulator for style/script content.
     * @returns {string[]} An array of Syqlorix string representations for the nodes.
     */
    function processChildNodes(nodes, level, collectedCodeBlocks) {
        return Array.from(nodes)
            .map(node => processNode(node, level, collectedCodeBlocks))
            .filter(Boolean); // Filter out null results (like whitespace text nodes)
    }

    /**
     * Processes a single DOM node.
     */
    function processNode(node, level, collectedCodeBlocks) {
        const indent = '    '.repeat(level);

        // Case 1: ELEMENT_NODE (e.g., <div>, <p>)
        if (node.nodeType === Node.ELEMENT_NODE) {
            let tagName = node.tagName.toLowerCase();

            // Handle internal <style> and <script> tags idiomatically
            const isInternalScript = tagName === 'script' && !node.hasAttribute('src');
            const isInternalStyle = tagName === 'style';

            if (isInternalStyle || isInternalScript) {
                const contentType = isInternalStyle ? 'css' : 'js';
                const content = node.innerHTML.trim();
                const variableName = `internal_${contentType}_${collectedCodeBlocks.filter(b => b.type === contentType).length + 1}`;
                
                collectedCodeBlocks.push({ name: variableName, content: content, type: contentType });
                return `${indent}${tagName}(${variableName})`;
            }

            tagName = KEYWORD_MAP[tagName] || tagName;

            const children = processChildNodes(node.childNodes, level + 1, collectedCodeBlocks);
            const attrs = processAttributes(node.attributes);
            const allArgs = [...children, ...attrs];

            if (allArgs.length === 0) return `${indent}${tagName}()`;
            
            const childIndent = '    '.repeat(level + 1);
            return `${indent}${tagName}(\n${childIndent}${allArgs.join(`,\n${childIndent}`)}\n${indent})`;
        }
        
        // Case 2: TEXT_NODE
        if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
            return `${indent}"${node.textContent.trim().replace(/"/g, '\\"')}"`;
        }
        
        // Case 3: COMMENT_NODE
        if (node.nodeType === Node.COMMENT_NODE) {
            return `${indent}Comment("${node.textContent.trim().replace(/"/g, '\\"')}")`;
        }
        
        return null;
    }

    /**
     * Processes element attributes into Syqlorix keyword arguments.
     * @param {NamedNodeMap} attributeNodes The attributes of a DOM node.
     * @returns {string[]} An array of formatted attribute strings.
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