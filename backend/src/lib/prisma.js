'use strict';

const { PrismaClient } = require('@prisma/client');

// Instance unique de PrismaClient partagée par toutes les routes
// Évite la saturation du pool de connexions PostgreSQL
const prisma = new PrismaClient();

module.exports = prisma;
