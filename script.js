let htmlEditor, syqlorixEditor;
let previewPanel, previewToggle;

// Initialize Monaco Editor
require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.34.0/min/vs' } });

require(['vs/editor/editor.main'], function() {
    // HTML Editor
    htmlEditor = monaco.editor.create(document.getElementById('html-input-container'), {
        value: '<!DOCTYPE html>\n<html>\n<head>\n    <title>My Page</title>\n</head>\n<body>\n    <h1>Hello World!</h1>\n    <p>This is a simple HTML page.</p>\n</body>\n</html>',
        language: 'html',
        theme: 'vs-dark',
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 14,
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        wordWrap: 'on'
    });
    
    // Syqlorix Editor (readonly)
    syqlorixEditor = monaco.editor.create(document.getElementById('syqlorix-output-container'), {
        value: '',
        language: 'python',
        theme: 'vs-dark',
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 14,
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        readOnly: true
    });
    
    // Convert HTML to Syqlorix on change
    htmlEditor.onDidChangeModelContent(() => {
        convertHtmlToSyqlorix();
    });
    
    // Initial conversion
    convertHtmlToSyqlorix();
});

// Initialize UI elements
document.addEventListener('DOMContentLoaded', function() {
    previewPanel = document.querySelector('.preview-panel');
    previewToggle = document.querySelector('.preview-toggle');
    
    // Preview toggle functionality
    previewToggle.addEventListener('click', function() {
        togglePreview();
    });
    
    // Close preview button
    document.querySelector('.preview-close').addEventListener('click', function() {
        closePreview();
    });
    
    // Copy button functionality
    document.getElementById('copy-button').addEventListener('click', function() {
        copyToClipboard();
    });
    
    // Download button functionality
    document.getElementById('download-button').addEventListener('click', function() {
        downloadPythonFile();
    });
    
    // Example selector
    document.getElementById('example-select').addEventListener('change', function() {
        loadExample(this.value);
    });
});

function togglePreview() {
    previewPanel.classList.toggle('active');
    previewToggle.classList.toggle('active');
    
    // Update icon
    const icon = previewToggle.querySelector('i');
    if (previewPanel.classList.contains('active')) {
        icon.className = 'fas fa-arrow-left';
    } else {
        icon.className = 'fas fa-eye';
    }
}

function closePreview() {
    previewPanel.classList.remove('active');
    previewToggle.classList.remove('active');
    previewToggle.querySelector('i').className = 'fas fa-eye';
}

function convertHtmlToSyqlorix() {
    if (!htmlEditor) return;
    
    const htmlCode = htmlEditor.getValue();
    const syqlorixCode = generateSyqlorixCode(htmlCode);
    
    if (syqlorixEditor) {
        syqlorixEditor.setValue(syqlorixCode);
    }
    
    updatePreview(htmlCode);
}

function generateSyqlorixCode(html) {
    // Basic HTML to Syqlorix conversion
    const lines = [
        'from syqlorix import Syqlorix',
        '',
        'app = Syqlorix()',
        '',
        '@app.route("/")',
        'def index():',
        '    return """',
        ...html.split('\n').map(line => '    ' + line),
        '    """',
        '',
        'if __name__ == "__main__":',
        '    app.run(debug=True)'
    ];
    
    return lines.join('\n');
}

function updatePreview(htmlCode) {
    const previewFrame = document.getElementById('preview-frame');
    const statusMessage = document.getElementById('status-message');
    
    try {
        const blob = new Blob([htmlCode], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        previewFrame.src = url;
        
        statusMessage.textContent = 'Preview updated successfully';
        statusMessage.className = 'status success';
        
        // Clear status after 2 seconds
        setTimeout(() => {
            statusMessage.style.display = 'none';
        }, 2000);
    } catch (error) {
        statusMessage.textContent = 'Error updating preview: ' + error.message;
        statusMessage.className = 'status error';
    }
}

function copyToClipboard() {
    if (!syqlorixEditor) return;
    
    const code = syqlorixEditor.getValue();
    navigator.clipboard.writeText(code).then(() => {
        const button = document.getElementById('copy-button');
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-check mr-1"></i>Copied!';
        button.classList.add('copied');
        
        setTimeout(() => {
            button.innerHTML = originalText;
            button.classList.remove('copied');
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy: ', err);
    });
}

function downloadPythonFile() {
    if (!syqlorixEditor) return;
    
    const code = syqlorixEditor.getValue();
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'syqlorix_app.py';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function loadExample(type) {
    let exampleHtml = '';
    
    switch(type) {
        case 'simple':
            exampleHtml = `<!DOCTYPE html>
<html>
<head>
<title>Simple Page</title>
<style>
body { font-family: Arial, sans-serif; margin: 40px; }
h1 { color: #333; }
p { line-height: 1.6; }
</style>
</head>
<body>
<h1>Welcome to My Simple Page</h1>
<p>This is a simple HTML page with basic styling.</p>
<button onclick="alert('Hello from Syqlorix!')">Click Me</button>
</body>
</html>`;
            break;
            
        case 'advanced':
            exampleHtml = `<!DOCTYPE html>
<html>
<head>
<title>Advanced Demo</title>
<style>
body { 
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    margin: 0;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
}
.container {
    text-align: center;
    padding: 2rem;
    background: rgba(255,255,255,0.1);
    border-radius: 20px;
    backdrop-filter: blur(10px);
    box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
}
button {
    background: #ff6b6b;
    color: white;
    border: none;
    padding: 15px 30px;
    border-radius: 25px;
    font-size: 1.1rem;
    cursor: pointer;
    transition: transform 0.2s;
}
button:hover { transform: scale(1.05); }
</style>
</head>
<body>
<div class="container">
<h1>Advanced Syqlorix Demo</h1>
<p>This example showcases modern CSS features including gradients, backdrop filters, and animations.</p>
<button onclick="this.innerHTML = 'Clicked!'">Interactive Button</button>
</div>
</body>
</html>`;
            break;
            
        case 'template':
            exampleHtml = `<!DOCTYPE html>
<html>
<head>
<title>App Template</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
.navbar {
    background: #2c3e50;
    color: white;
    padding: 1rem 2rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
}
.content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
}
.card {
    background: #f8f9fa;
    padding: 2rem;
    border-radius: 10px;
    margin-bottom: 2rem;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}
.btn {
    background: #3498db;
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 5px;
    cursor: pointer;
    margin: 0.5rem;
}
.btn:hover { background: #2980b9; }
.footer {
    background: #34495e;
    color: white;
    text-align: center;
    padding: 2rem;
    margin-top: 3rem;
}
</style>
</head>
<body>
<nav class="navbar">
<h1>My Syqlorix App</h1>
<div>
    <button class="btn">Home</button>
    <button class="btn">About</button>
    <button class="btn">Contact</button>
</div>
</nav>

<div class="content">
<div class="card">
    <h2>Welcome to Your App</h2>
    <p>This is a complete app template that you can use as a starting point for your Syqlorix applications.</p>
    <button class="btn">Get Started</button>
</div>

<div class="card">
    <h2>Features</h2>
    <ul>
        <li>Responsive design</li>
        <li>Modern UI components</li>
        <li>Easy to customize</li>
        <li>Ready for Syqlorix</li>
    </ul>
</div>
</div>

<footer class="footer">
<p>&copy; 2025 My Syqlorix App. Built with ❤️ using Syqlorix.</p>
</footer>
</body>
</html>`;
            break;
    }
    
    if (htmlEditor && exampleHtml) {
        htmlEditor.setValue(exampleHtml);
    }
}

// Handle swipe gestures for mobile
let startX, startY, currentX, currentY;

document.addEventListener('touchstart', function(e) {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
});

document.addEventListener('touchmove', function(e) {
    if (!startX || !startY) return;
    
    currentX = e.touches[0].clientX;
    currentY = e.touches[0].clientY;
    
    const diffX = startX - currentX;
    const diffY = startY - currentY;
    
    if (Math.abs(diffX) > Math.abs(diffY)) {
        if (diffX > 50 && !previewPanel.classList.contains('active')) {
            // Swipe left to show preview
            togglePreview();
        } else if (diffX < -50 && previewPanel.classList.contains('active')) {
            // Swipe right to hide preview
            closePreview();
        }
    }
});

document.addEventListener('touchend', function() {
    startX = null;
    startY = null;
});