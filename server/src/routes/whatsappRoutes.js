const express = require('express');
const asyncWrapper = require('../middleware/asyncWrapper');
const {
  verifyWebhook,
  handleWebhook,
  mockWebhook,
} = require('../controllers/whatsappController');

const router = express.Router();

// Meta Webhook Verification Handshake
router.get('/webhook', asyncWrapper(verifyWebhook));

// Meta Webhook Ingestion
router.post('/webhook', asyncWrapper(handleWebhook));

// Mock Webhook Simulator for Testing
router.post('/mock', asyncWrapper(mockWebhook));
router.post('/simulate', asyncWrapper(mockWebhook));

module.exports = router;
