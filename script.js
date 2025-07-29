document.addEventListener('DOMContentLoaded', () => {
    const htmlInput = document.getElementById('html-input');
    const syqlorixOutput = document.getElementById('syqlorix-output');
    const statusMessage = document.getElementById('status-message');

    // Syqlorix reserved words mapping
    const keywordMappings = {
        'class': 'class_',
        'input': 'input_'
        // Add more if Syqlorix has other reserved-word tags
    };

    /**
     * The main conversion function. It takes an HTML string and returns Syqlorix code.
     * @param {string} htmlString - The HTML code to convert.
     * @returns {string} The resulting Syqlorix code.
     */
    function convertHtmlToSyqlorix(htmlString) {
        // Use the browser's built-in parser to create a DOM tree
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, 'text/html');

        // Check for parsing errors
        if (doc.getElementsByTagName('parsererror').length > 0) {
            throw new Error('Invalid HTML detected. The structure might be broken.');
        }
        
        // Recursively process the children of the <body> tag
        const children = Array.from(doc.body.childNodes);
        const syqlorixNodes = children.map(node => processNode(node, 0)).filter(Boolean);
        
        return syqlorixNodes.join('\n');
    }

    /**
     * Recursively processes a single DOM node.
     * @param {Node} node - The DOM node to process.
     * @param {number} indentLevel - The current indentation level for pretty-printing.
     * @returns {string|null} The Syqlorix string for the node, or null if it's insignificant.
     */
    function processNode(node, indentLevel) {
        const indent = '    '.repeat(indentLevel);

        // Case 1: Element Node (e.g., <div>, <h1>, <p>)
        if (node.nodeType === Node.ELEMENT_NODE) {
            let tagName = node.tagName.toLowerCase();
            tagName = keywordMappings[tagName] || tagName;

            // Process attributes
            const attrs = Array.from(node.attributes).map(attr => {
                const name = keywordMappings[attr.name] || attr.name;
                const value = attr.value.replace(/"/g, '\\"'); // Escape double quotes
                // For boolean attributes (e.g., 'disabled'), Syqlorix expects True
                return `${name}=${value === "" ? "True" : `"${value}"`}`;
            });
            
            // Process child nodes
            const children = Array.from(node.childNodes)
                .map(child => processNode(child, indentLevel + 1))
                .filter(Boolean); // Remove null/empty results
            
            const allArgs = [...children, ...attrs];

            if (allArgs.length === 0) {
                return `${indent}${tagName}()`;
            }
            
            // Format the output string correctly
            const childrenIndent = '    '.repeat(indentLevel + 1);
            if(allArgs.length > 1) {
                 return `${indent}${tagName}(\n${childrenIndent}${allArgs.join(`,\n${childrenIndent}`)}\n${indent})`;
            } else {
                 return `${indent}${tagName}(${allArgs.join(', ')})`;
            }
        }
        
        // Case 2: Text Node (the text content inside an element)
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent.trim();
            // Ignore text nodes that are only whitespace
            if (text) {
                // Escape backslashes and wrap in quotes for Python
                const escapedText = text.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
                return `${indent}"${escapedText}"`;
            }
            return null; // Ignore empty text nodes
        }
        
        // Case 3: Comment Node (<!-- ... -->)
        if (node.nodeType === Node.COMMENT_NODE) {
            const commentText = node.textContent.trim().replace(/"/g, '\\"');
            return `${indent}Comment("${commentText}")`;
        }
        
        return null; // Ignore other node types
    }

    // Real-time conversion logic
    function handleInput() {
        const html = htmlInput.value;
        if (!html) {
            syqlorixOutput.value = '';
            statusMessage.style.display = 'none';
            return;
        }

        try {
            const syqlorixCode = convertHtmlToSyqlorix(html);
            syqlorixOutput.value = syqlorixCode;
            statusMessage.style.display = 'none'; // Hide on success
        } catch (error) {
            syqlorixOutput.value = `# Error: Could not convert HTML.\n\n# ${error.message}`;
            statusMessage.textContent = error.message;
            statusMessage.className = 'status error';
        }
    }
    
    // Set a default example to demonstrate the tool's usage
    function setDefaultExample() {
        const defaultHtml = `<!-- A sample container -->
<div class="card" id="welcome-card">
    <h1>Welcome to the Converter!</h1>
    <p>This is a paragraph with an <strong>important</strong> word.</p>
    <br>
    <input type="text" placeholder="Enter your name" disabled>
</div>`;
        htmlInput.value = defaultHtml;
        handleInput();
    }
    
    // Attach the event listener to the input text area
    htmlInput.addEventListener('input', handleInput);
    
    // Run on page load
    setDefaultExample();
});