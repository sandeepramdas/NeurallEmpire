/* ===================================
   FORMS MODULE
   =================================== */

const FormsModule = {
    init() {
        this.bindContactForm();
        this.bindAgentCategoryFilters();
        this.setupFormValidation();
    },

    bindContactForm() {
        const contactForm = NeurallUtils.dom.select('#empireForm');
        if (!contactForm) return;

        NeurallUtils.dom.on(contactForm, 'submit', (e) => {
            e.preventDefault();
            this.handleContactFormSubmit(contactForm);
        });

        // Real-time validation
        const formFields = contactForm.querySelectorAll('input, textarea');
        formFields.forEach(field => {
            NeurallUtils.dom.on(field, 'blur', () => {
                this.validateField(field);
            });

            NeurallUtils.dom.on(field, 'input', () => {
                this.clearFieldError(field);
            });
        });
    },

    bindAgentCategoryFilters() {
        const categoryButtons = NeurallUtils.dom.selectAll('.category-btn');

        categoryButtons.forEach(button => {
            NeurallUtils.dom.on(button, 'click', () => {
                this.handleCategoryFilter(button);
            });
        });
    },

    setupFormValidation() {
        // Add custom validation styles
        const style = document.createElement('style');
        style.textContent = `
            .form__input.error,
            .form__textarea.error {
                border-color: #ff4444 !important;
                box-shadow: 0 0 10px rgba(255, 68, 68, 0.2) !important;
            }

            .error-message {
                color: #ff4444;
                font-size: 14px;
                margin-top: 5px;
                display: flex;
                align-items: center;
                gap: 5px;
            }

            .error-message::before {
                content: '⚠️';
                font-size: 12px;
            }
        `;
        document.head.appendChild(style);
    },

    async handleContactFormSubmit(form) {
        // Clear previous errors
        NeurallUtils.form.clearErrors(form);

        // Get form data
        const formData = NeurallUtils.form.getFormData(form);

        // Validate form
        const validationErrors = this.validateContactForm(formData);
        if (validationErrors.length > 0) {
            this.showValidationErrors(form, validationErrors);
            return;
        }

        // Show loading state
        const submitButton = form.querySelector('.form__submit');
        this.setSubmitButtonLoading(submitButton, true);

        try {
            // Simulate AI analysis
            await this.simulateAIAnalysis(formData);

            // Submit form data
            await this.submitContactForm(formData);

            // Show success
            this.showSubmitSuccess(submitButton, formData);

            // Reset form
            setTimeout(() => {
                form.reset();
                this.resetSubmitButton(submitButton);
            }, 3000);

        } catch (error) {
            console.error('Form submission error:', error);
            this.showSubmitError(submitButton);
        }
    },

    validateContactForm(data) {
        const errors = [];

        // Required fields
        if (!data.name || data.name.trim().length < 2) {
            errors.push({ field: 'name', message: 'Name must be at least 2 characters long' });
        }

        if (!data.email || !NeurallUtils.form.isValidEmail(data.email)) {
            errors.push({ field: 'email', message: 'Please enter a valid email address' });
        }

        if (!data.company || data.company.trim().length < 2) {
            errors.push({ field: 'company', message: 'Company name is required' });
        }

        // Optional phone validation
        if (data.phone && !NeurallUtils.form.isValidPhone(data.phone)) {
            errors.push({ field: 'phone', message: 'Please enter a valid phone number' });
        }

        // Budget validation (if provided)
        if (data.budget && data.budget.trim()) {
            const budgetValue = data.budget.replace(/[^\d]/g, '');
            if (budgetValue && parseInt(budgetValue) < 10000) {
                errors.push({ field: 'budget', message: 'Minimum budget is ₹10,000' });
            }
        }

        return errors;
    },

    validateField(field) {
        const value = field.value.trim();
        const fieldName = field.name;
        let error = null;

        switch (fieldName) {
            case 'name':
                if (!value || value.length < 2) {
                    error = 'Name must be at least 2 characters long';
                }
                break;

            case 'email':
                if (!value) {
                    error = 'Email is required';
                } else if (!NeurallUtils.form.isValidEmail(value)) {
                    error = 'Please enter a valid email address';
                }
                break;

            case 'company':
                if (!value || value.length < 2) {
                    error = 'Company name is required';
                }
                break;

            case 'phone':
                if (value && !NeurallUtils.form.isValidPhone(value)) {
                    error = 'Please enter a valid phone number';
                }
                break;

            case 'budget':
                if (value) {
                    const budgetValue = value.replace(/[^\d]/g, '');
                    if (budgetValue && parseInt(budgetValue) < 10000) {
                        error = 'Minimum budget is ₹10,000';
                    }
                }
                break;
        }

        if (error) {
            NeurallUtils.form.showError(field, error);
            return false;
        } else {
            this.clearFieldError(field);
            return true;
        }
    },

    clearFieldError(field) {
        field.classList.remove('error');
        const errorMessage = field.parentNode.querySelector('.error-message');
        if (errorMessage) {
            errorMessage.remove();
        }
    },

    showValidationErrors(form, errors) {
        errors.forEach(({ field, message }) => {
            const fieldElement = form.querySelector(`[name="${field}"]`);
            if (fieldElement) {
                NeurallUtils.form.showError(fieldElement, message);
            }
        });

        // Focus on first error field
        if (errors.length > 0) {
            const firstErrorField = form.querySelector(`[name="${errors[0].field}"]`);
            if (firstErrorField) {
                firstErrorField.focus();
            }
        }
    },

    async simulateAIAnalysis(formData) {
        // Simulate AI processing time
        return new Promise(resolve => {
            setTimeout(resolve, 2000 + Math.random() * 1000);
        });
    },

    async submitContactForm(formData) {
        try {
            // Try to submit to server
            const response = await NeurallUtils.network.request('/api/contact', {
                method: 'POST',
                body: JSON.stringify({
                    ...formData,
                    timestamp: new Date().toISOString(),
                    source: 'neurallempire.com'
                })
            });

            console.log('Contact form submitted successfully:', response);
            return response;

        } catch (error) {
            // If server is not available, save to localStorage as backup
            console.warn('Server not available, saving to localStorage:', error);

            const submissions = NeurallUtils.storage.get('contact_submissions', []);
            submissions.push({
                ...formData,
                timestamp: new Date().toISOString(),
                submitted: false
            });
            NeurallUtils.storage.set('contact_submissions', submissions);

            return { status: 'saved_locally' };
        }
    },

    setSubmitButtonLoading(button, isLoading) {
        if (!button) return;

        if (isLoading) {
            button.disabled = true;
            button.dataset.originalText = button.textContent;
            button.textContent = 'AI Analyzing Your Empire Potential...';
            button.classList.add('loading');
        } else {
            button.disabled = false;
            button.textContent = button.dataset.originalText || 'Begin Your Empire';
            button.classList.remove('loading');
        }
    },

    showSubmitSuccess(button, formData) {
        if (!button) return;

        button.textContent = '✓ Empire Initiation Confirmed';
        button.classList.add('success');
        button.style.background = 'var(--success-green)';

        // Show personalized success message
        setTimeout(() => {
            const message = `Welcome to NEURALLEMPIRE, ${formData.name}! Your journey to market domination begins now. Our AI agents are already working on your custom strategy.`;

            if (this.showSuccessModal) {
                this.showSuccessModal(message);
            } else {
                alert(message);
            }
        }, 1000);
    },

    showSubmitError(button) {
        if (!button) return;

        button.textContent = '❌ Submission Failed - Try Again';
        button.classList.add('error');
        button.style.background = '#ff4444';

        setTimeout(() => {
            this.resetSubmitButton(button);
        }, 3000);
    },

    resetSubmitButton(button) {
        if (!button) return;

        button.textContent = button.dataset.originalText || 'Begin Your Empire';
        button.classList.remove('loading', 'success', 'error');
        button.style.background = '';
        button.disabled = false;
    },

    handleCategoryFilter(clickedButton) {
        // Update active state
        const categoryButtons = NeurallUtils.dom.selectAll('.category-btn');
        categoryButtons.forEach(btn => btn.classList.remove('active'));
        clickedButton.classList.add('active');

        // Get category
        const category = clickedButton.textContent.trim().toLowerCase();

        // Filter agents (this is a simple example - you could implement more sophisticated filtering)
        const agentCards = NeurallUtils.dom.selectAll('.agent');

        agentCards.forEach(card => {
            const shouldShow = category === 'lead generation' ||
                              this.agentMatchesCategory(card, category);

            if (shouldShow) {
                card.style.display = 'block';
                AnimationsModule.animateNewElement(card, Math.random() * 200);
            } else {
                card.style.display = 'none';
            }
        });

        console.log(`Filtered agents by category: ${category}`);
    },

    agentMatchesCategory(agentCard, category) {
        // Simple category matching based on agent name/capability
        const agentName = agentCard.querySelector('.agent__name')?.textContent.toLowerCase() || '';
        const agentCapability = agentCard.querySelector('.agent__capability')?.textContent.toLowerCase() || '';

        const categoryMappings = {
            'content creation': ['social', 'content', 'viral'],
            'conversion': ['optimizer', 'conversion', 'sales'],
            'analytics': ['analytics', 'data', 'insights']
        };

        const keywords = categoryMappings[category] || [];
        return keywords.some(keyword =>
            agentName.includes(keyword) || agentCapability.includes(keyword)
        );
    },

    // Method to retry failed submissions
    async retryFailedSubmissions() {
        const failedSubmissions = NeurallUtils.storage.get('contact_submissions', [])
            .filter(submission => !submission.submitted);

        if (failedSubmissions.length === 0) return;

        console.log(`Retrying ${failedSubmissions.length} failed submissions...`);

        for (const submission of failedSubmissions) {
            try {
                await this.submitContactForm(submission);
                submission.submitted = true;
                console.log('Successfully retried submission for:', submission.email);
            } catch (error) {
                console.warn('Retry failed for submission:', submission.email, error);
            }
        }

        // Update storage
        const allSubmissions = NeurallUtils.storage.get('contact_submissions', []);
        NeurallUtils.storage.set('contact_submissions', allSubmissions);
    }
};

// Auto-initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        FormsModule.init();

        // Retry failed submissions after a delay
        setTimeout(() => {
            FormsModule.retryFailedSubmissions();
        }, 5000);
    });
} else {
    FormsModule.init();
    setTimeout(() => {
        FormsModule.retryFailedSubmissions();
    }, 5000);
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FormsModule;
} else if (typeof window !== 'undefined') {
    window.FormsModule = FormsModule;
}