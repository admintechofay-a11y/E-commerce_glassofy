const express = require('express');
const { auth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  checkoutSchema,
  verifyRazorpaySchema,
  cancelOrderSchema,
} = require('../validations/orderValidation');
const {
  checkout,
  verifyPayment,
  getMyOrders,
  getOrderById,
  cancelOrder,
  downloadInvoice,
} = require('../controllers/orderController');

const router = express.Router();

router.use(auth);

router.post('/checkout', validate(checkoutSchema), checkout);
router.post('/verify-payment', validate(verifyRazorpaySchema), verifyPayment);
router.get('/', getMyOrders);
router.get('/:id', getOrderById);
router.put('/:id/cancel', validate(cancelOrderSchema), cancelOrder);
router.get('/:id/invoice', downloadInvoice);

module.exports = router;
