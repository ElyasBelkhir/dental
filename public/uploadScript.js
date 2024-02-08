document.getElementById('uploadForm').addEventListener('submit', function(event) {
    event.preventDefault(); // Prevent the default form submission

     // Get the button and spinner elements
     const button = document.getElementById('uploadButton');
     const spinner = document.getElementById('loadingSpinner');
 
     // Disable the button and show the spinner
     button.disabled = true;
     button.innerText = 'Submitting...'; // Optional: Change button text
     spinner.style.display = 'block'; // Show spinner

    const formData = new FormData(this);

    fetch('/upload', { // Make sure this matches your server endpoint
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => { throw new Error(`${text} (Status: ${response.status})`); });
        }
        return response.json(); // Parse the JSON response
    })
    .then(data => {
        if (data.success) {
            console.log('File uploaded successfully:', data);
            // Hide the form
            document.querySelector('.upload-form-container').style.display = 'none';
            
            // Show the submission message
            const submissionMessage = document.getElementById('submissionMessage');
            submissionMessage.style.display = 'block'; // Make the message visible

            // Optionally, you can scroll to the submission message so the user sees it immediately
            submissionMessage.scrollIntoView({ behavior: 'smooth' });
        } else {
            // Handle server-sent errors (if 'data.error' exists)
            console.error('Error uploading file:', data.error);
            alert('Error uploading file: ' + data.error);
        }
        // Inside the .then block after data.success check
        document.getElementById('submitNewCaseButton').style.display = 'block'; // Display the "Submit New Case" button

    })
    .catch(error => {
        // Handle network errors or other fetch-related errors
        console.error('Failed to send file:', error);
        alert('Failed to send file: ' + error.message);
    })
    .finally(() => {
        // Re-enable the button and hide the spinner after the request is complete
        button.disabled = false;
        button.innerText = 'Submit'; // Reset button text
        spinner.style.display = 'none'; // Hide spinner
    });
});
// After the existing form submission event listener

document.getElementById('submitNewCaseButton').addEventListener('click', function() {
    // Reset the form
    document.getElementById('uploadForm').reset();

    // Hide the submission message
    document.getElementById('submissionMessage').style.display = 'none';

    // Show the form again
    document.querySelector('.upload-form-container').style.display = 'block';

    // Scroll to the form so the user can see it
    document.querySelector('.upload-form-container').scrollIntoView({ behavior: 'smooth' });
});
