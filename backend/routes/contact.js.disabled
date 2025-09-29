const express = require('express');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

const Contact = require('../models/Contact');
const { optionalAuth } = require('../middleware/auth');
const emailService = require('../services/emailService');

const router = express.Router();

// Rate limiting for contact form
const contactLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3, // limit each IP to 3 contact form submissions per windowMs
    message: {
        success: false,
        error: 'Too many contact submissions, please try again later.',
        retryAfter: 15 * 60 * 1000
    }
});

// Validation rules
const contactValidation = [
    body('name')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters'),

    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),

    body('company')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Company name cannot exceed 100 characters'),

    body('phone')
        .optional()
        .trim()
        .matches(/^[\+]?[1-9][\d]{0,15}$/)
        .withMessage('Please provide a valid phone number'),

    body('message')
        .trim()
        .isLength({ min: 10, max: 1000 })
        .withMessage('Message must be between 10 and 1000 characters'),

    body('subject')
        .optional()
        .trim()
        .isLength({ max: 200 })
        .withMessage('Subject cannot exceed 200 characters')
];

// @desc    Submit contact form
// @route   POST /api/contact
// @access  Public
router.post('/', contactLimiter, optionalAuth, contactValidation, async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { name, email, company, phone, message, subject } = req.body;

        // Get client information
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.get('User-Agent');

        // Create contact entry
        const contactData = {
            name,
            email,
            company,
            phone,
            message,
            subject: subject || 'Contact Form Submission',
            ipAddress,
            userAgent,
            source: 'website'
        };

        // If user is authenticated, link the contact to the user
        if (req.user) {
            contactData.userId = req.user._id;
            contactData.source = 'authenticated_user';
        }

        const contact = await Contact.create(contactData);

        // Send notification email
        try {
            await emailService.sendContactNotification({
                ...contactData,
                contactId: contact._id
            });
        } catch (emailError) {
            console.error('Contact notification email failed:', emailError);
            // Don't fail the contact submission for email errors
        }

        res.status(201).json({
            success: true,
            message: 'Thank you for your message! We\'ll get back to you soon.',
            data: {
                contactId: contact._id,
                submittedAt: contact.createdAt
            }
        });

    } catch (error) {
        console.error('Contact form submission error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to submit contact form. Please try again later.'
        });
    }
});

// @desc    Get contact submissions (admin only)
// @route   GET /api/contact
// @access  Private/Admin
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 10, status, search } = req.query;

        const query = {};

        // Filter by status if provided
        if (status) {
            query.status = status;
        }

        // Search functionality
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { company: { $regex: search, $options: 'i' } },
                { message: { $regex: search, $options: 'i' } }
            ];
        }

        const contacts = await Contact.find(query)
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .populate('userId', 'firstName lastName email');

        const total = await Contact.countDocuments(query);

        res.json({
            success: true,
            data: {
                contacts,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(total / limit),
                    total,
                    hasNextPage: page < Math.ceil(total / limit),
                    hasPrevPage: page > 1
                }
            }
        });

    } catch (error) {
        console.error('Get contacts error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch contacts'
        });
    }
});

// @desc    Update contact status
// @route   PUT /api/contact/:id
// @access  Private/Admin
router.put('/:id', async (req, res) => {
    try {
        const { status, notes } = req.body;

        const contact = await Contact.findByIdAndUpdate(
            req.params.id,
            {
                status,
                notes,
                updatedAt: new Date()
            },
            { new: true, runValidators: true }
        );

        if (!contact) {
            return res.status(404).json({
                success: false,
                error: 'Contact not found'
            });
        }

        res.json({
            success: true,
            message: 'Contact updated successfully',
            data: contact
        });

    } catch (error) {
        console.error('Update contact error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update contact'
        });
    }
});

module.exports = router;