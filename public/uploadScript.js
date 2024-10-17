// uploadScript.js

let pdfFiles = [];
let stlFiles = [];

// Function to sanitize file names
function sanitizeFileName(name) {
    return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function updateFileList(files, listElement) {
    listElement.innerHTML = '';
    for (let i = 0; i < files.length; i++) {
        const li = document.createElement('li');
        li.textContent = files[i].name;
        const removeButton = document.createElement('button');
        removeButton.textContent = 'Remove';
        removeButton.onclick = function() {
            files.splice(i, 1);
            updateFileList(files, listElement);
        };
        li.appendChild(removeButton);
        listElement.appendChild(li);
    }
}

function handleFileSelect(event, fileArray, listElement) {
    const newFiles = Array.from(event.target.files);
    fileArray.push(...newFiles);
    updateFileList(fileArray, listElement);
}

document.getElementById('pdfRxFormButton').addEventListener('click', function() {
    document.getElementById('pdfRxForm').click();
});

document.getElementById('stlFileButton').addEventListener('click', function() {
    document.getElementById('stlFile').click();
});

document.getElementById('pdfRxForm').addEventListener('change', function(event) {
    handleFileSelect(event, pdfFiles, document.getElementById('pdfRxFormList'));
});

document.getElementById('stlFile').addEventListener('change', function(event) {
    handleFileSelect(event, stlFiles, document.getElementById('stlFileList'));
});

document.getElementById('uploadForm').addEventListener('submit', async function(event) {
    event.preventDefault(); // Prevent the default form submission

    // Get the button and spinner elements
    const button = document.getElementById('uploadButton');
    const spinner = document.getElementById('loadingSpinner');

    // Disable the button and show the spinner
    button.disabled = true;
    button.innerText = 'Submitting...';
    spinner.style.display = 'block';

    try {
        // Collect user data
        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const note = document.getElementById('note').value.trim();

        // Validate required fields
        if (!name || !email) {
            alert('Name and Email are required.');
            throw new Error('Validation failed: Name and Email are required.');
        }

        // Sanitize user name for folder name
        const sanitizedUserName = name.replace(/[^a-zA-Z0-9]/g, '_');

        // Generate unique ID and create parentFolder
        const timestamp = Date.now();
        const uniqueId = `${timestamp}-${Math.floor(Math.random() * 10000)}`;
        const parentFolder = `Submissions/${sanitizedUserName}-${uniqueId}`;

        // Submit metadata to the server, including parentFolder and timestamp
        const metadataResponse = await fetch('/submit-metadata', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, note, parentFolder, timestamp })
        });

        if (!metadataResponse.ok) {
            const errorText = await metadataResponse.text();
            throw new Error(`Metadata submission failed: ${errorText}`);
        }

        // Function to upload a file to GCS using a signed URL
        async function uploadFileToGCS(file, folderName) {
            const sanitizedFileName = sanitizeFileName(file.name);

            // Request a signed URL from the server
            const signedUrlResponse = await fetch('/generate-signed-url', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filename: `${parentFolder}/${folderName}/${sanitizedFileName}`,
                    contentType: file.type || 'application/octet-stream'
                })
            });

            if (!signedUrlResponse.ok) {
                const errorText = await signedUrlResponse.text();
                throw new Error(`Failed to get signed URL: ${errorText}`);
            }

            const { url } = await signedUrlResponse.json();

            // Upload the file directly to GCS
            const uploadResponse = await fetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': file.type || 'application/octet-stream' },
                body: file
            });

            if (!uploadResponse.ok) {
                throw new Error(`Failed to upload file: ${uploadResponse.statusText}`);
            }

            console.log(`File uploaded successfully: ${file.name}`);
        }

        // Upload PDF files
        for (const file of pdfFiles) {
            await uploadFileToGCS(file, 'PDFs');
        }

        // Upload STL files
        for (const file of stlFiles) {
            await uploadFileToGCS(file, '3DModels');
        }

        // Upload the note as a file if it exists
        if (note) {
            const noteFileName = `Note-${sanitizedUserName}-${uniqueId}.txt`;
            const noteBlob = new Blob([note], { type: 'text/plain' });
            const noteFile = new File([noteBlob], noteFileName, { type: 'text/plain' });

            await uploadFileToGCS(noteFile, 'Notes');
        }

        // Show success message
        document.querySelector('.upload-form-container').style.display = 'none';
        const submissionMessage = document.getElementById('submissionMessage');
        submissionMessage.style.display = 'block';
        submissionMessage.scrollIntoView({ behavior: 'smooth' });
        document.getElementById('submitNewCaseButton').style.display = 'block';
    } catch (error) {
        console.error('Error:', error);
        alert('Error: ' + error.message);
    } finally {
        // Re-enable the button and hide the spinner
        button.disabled = false;
        button.innerText = 'Submit';
        spinner.style.display = 'none';
    }
});

// "Submit New Case" button handler
document.getElementById('submitNewCaseButton').addEventListener('click', function() {
    // Reset the form
    document.getElementById('uploadForm').reset();
    pdfFiles = [];
    stlFiles = [];
    updateFileList(pdfFiles, document.getElementById('pdfRxFormList'));
    updateFileList(stlFiles, document.getElementById('stlFileList'));

    // Hide the submission message
    document.getElementById('submissionMessage').style.display = 'none';

    // Show the form again
    document.querySelector('.upload-form-container').style.display = 'block';

    // Scroll to the form
    document.querySelector('.upload-form-container').scrollIntoView({ behavior: 'smooth' });
});
