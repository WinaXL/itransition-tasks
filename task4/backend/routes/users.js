const express        = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const {
  getUsers,
  blockUsers,
  unblockUsers,
  deleteUsers,
  verifyUser,
} = require('../controllers/userController');

const router = express.Router();

// All user-management routes are protected by the centralized auth middleware.
router.use(authMiddleware);

router.get('/',              getUsers);
router.patch('/block',       blockUsers);
router.patch('/unblock',     unblockUsers);
router.delete('/',           deleteUsers);
router.patch('/:id/verify',  verifyUser);

module.exports = router;
