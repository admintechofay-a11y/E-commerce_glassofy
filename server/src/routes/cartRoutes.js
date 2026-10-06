const express = require('express');
const { auth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  addItemSchema,
  updateQuantitySchema,
  mergeCartSchema,
  applyCouponSchema,
} = require('../validations/cartValidation');
const {
  getCart,
  addItem,
  updateQuantity,
  removeItem,
  clearCart,
  mergeCart,
  applyCoupon,
  removeCoupon,
} = require('../controllers/cartController');

const router = express.Router();

router.use(auth);

router.get('/', getCart);
router.post('/items', validate(addItemSchema), addItem);
router.put('/items/:itemId', validate(updateQuantitySchema), updateQuantity);
router.delete('/items/:itemId', removeItem);
router.delete('/', clearCart);
router.post('/merge', validate(mergeCartSchema), mergeCart);
router.post('/coupon', validate(applyCouponSchema), applyCoupon);
router.delete('/coupon', removeCoupon);

module.exports = router;
