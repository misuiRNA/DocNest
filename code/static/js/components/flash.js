/**
 * Flash message component
 */

// Flash container
const flashContainer = document.getElementById('flash-messages');

// Show flash message
function showFlash(message, type = 'error', duration = 5000) {
    // Create flash message element
    const flashElement = document.createElement('div');
    flashElement.className = `flash-message ${type}`;
    flashElement.textContent = message;
    
    // Add close button
    const closeButton = document.createElement('span');
    closeButton.innerHTML = '&times;';
    closeButton.style.float = 'right';
    closeButton.style.cursor = 'pointer';
    closeButton.style.marginLeft = '10px';
    closeButton.addEventListener('click', () => {
        removeFlash(flashElement);
    });
    
    flashElement.insertBefore(closeButton, flashElement.firstChild);
    
    // Add to container
    flashContainer.appendChild(flashElement);
    
    // Auto-remove after duration
    if (duration > 0) {
        setTimeout(() => {
            removeFlash(flashElement);
        }, duration);
    }
    
    return flashElement;
}

// Remove flash message
function removeFlash(flashElement) {
    // Add fade-out animation
    flashElement.style.opacity = '0';
    flashElement.style.transform = 'translateY(-10px)';
    flashElement.style.transition = 'opacity 0.3s, transform 0.3s';
    
    // Remove after animation
    setTimeout(() => {
        if (flashElement.parentNode === flashContainer) {
            flashContainer.removeChild(flashElement);
        }
    }, 300);
}

// Clear all flash messages
function clearFlashes() {
    while (flashContainer.firstChild) {
        flashContainer.removeChild(flashContainer.firstChild);
    }
}

// Show error flash
function showError(message, duration = 5000) {
    return showFlash(message, 'error', duration);
}

// Show success flash
function showSuccess(message, duration = 5000) {
    return showFlash(message, 'success', duration);
}

// Show warning flash
function showWarning(message, duration = 5000) {
    return showFlash(message, 'warning', duration);
}
