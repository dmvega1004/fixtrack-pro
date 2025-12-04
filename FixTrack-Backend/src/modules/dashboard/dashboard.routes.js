// src/modules/dashboard/dashboard.routes.js
const express = require('express');
const router = express.Router();
const dashboardController = require('./dashboard.controller');
const authenticate = require('../../middlewares/authenticate');

router.get('/resumen', authenticate, dashboardController.getResumen);

module.exports = router;