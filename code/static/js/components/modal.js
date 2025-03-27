/**
 * Modal component
 */

// Modal element
const modal = document.getElementById('modal');
const modalContent = document.getElementById('modal-content');

// Open modal
function openModal(content, onClose = null) {
    // Set content
    modalContent.innerHTML = '';
    
    if (typeof content === 'string') {
        modalContent.innerHTML = content;
    } else if (content instanceof Node) {
        modalContent.appendChild(content);
    }
    
    // Show modal
    modal.style.display = 'block';
    
    // Store onClose callback
    if (onClose) {
        modal._onClose = onClose;
    } else {
        modal._onClose = null;
    }
    
    // Prevent body scrolling
    document.body.style.overflow = 'hidden';
}

// Close modal
function closeModal() {
    // Hide modal
    modal.style.display = 'none';
    
    // Clear content
    modalContent.innerHTML = '';
    
    // Call onClose callback if exists
    if (modal._onClose) {
        modal._onClose();
        modal._onClose = null;
    }
    
    // Restore body scrolling
    document.body.style.overflow = '';
}

// Close modal when clicking outside
modal.addEventListener('click', (event) => {
    if (event.target === modal) {
        closeModal();
    }
});

// Close modal when pressing Escape key
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.style.display === 'block') {
        closeModal();
    }
});

// Confirmation modal
function confirmModal(message, onConfirm, onCancel = null) {
    const content = ui.createElement('div', {}, [
        ui.createElement('p', { textContent: message, style: 'margin-bottom: 2rem;' }),
        ui.createElement('div', { style: 'display: flex; justify-content: flex-end; gap: 1rem;' }, [
            ui.createButton('取消', () => {
                closeModal();
                if (onCancel) onCancel();
            }, 'btn btn-danger'),
            ui.createButton('确认', () => {
                closeModal();
                onConfirm();
            }, 'btn btn-success')
        ])
    ]);
    
    openModal(content);
}

// Form modal
function formModal(title, formContent, onSubmit, submitText = '提交') {
    const form = ui.createElement('form', {
        onSubmit: (event) => {
            event.preventDefault();
            onSubmit(new FormData(form));
            closeModal();
        }
    });
    
    // Add form content
    if (typeof formContent === 'string') {
        form.innerHTML = formContent;
    } else if (formContent instanceof Node) {
        form.appendChild(formContent);
    } else if (Array.isArray(formContent)) {
        formContent.forEach(element => {
            form.appendChild(element);
        });
    }
    
    // Add submit button
    const submitButton = ui.createElement('button', {
        className: 'btn',
        type: 'submit',
        textContent: submitText
    });
    
    form.appendChild(submitButton);
    
    // Create modal content
    const content = ui.createElement('div', {}, [
        ui.createElement('h2', { textContent: title, style: 'margin-bottom: 1.5rem;' }),
        form
    ]);
    
    openModal(content);
    
    // Focus first input
    const firstInput = form.querySelector('input, select, textarea');
    if (firstInput) {
        firstInput.focus();
    }
    
    return form;
}
